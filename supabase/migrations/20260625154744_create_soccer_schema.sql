-- Teams
CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_name text NOT NULL,
  city text NOT NULL,
  stadium text NOT NULL,
  founded int NOT NULL,
  primary_color text NOT NULL DEFAULT '#00D4FF',
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Players
CREATE TABLE players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  position text NOT NULL,
  jersey_number int NOT NULL,
  nationality text NOT NULL,
  age int NOT NULL,
  height_cm int,
  weight_kg int,
  goals int NOT NULL DEFAULT 0,
  assists int NOT NULL DEFAULT 0,
  appearances int NOT NULL DEFAULT 0,
  rating numeric(3,1) NOT NULL DEFAULT 0,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_players_team ON players(team_id);

-- Matches
CREATE TABLE matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  away_team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  match_date timestamptz NOT NULL,
  venue text NOT NULL,
  home_score int NOT NULL DEFAULT 0,
  away_score int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  round int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_matches_home ON matches(home_team_id);
CREATE INDEX idx_matches_away ON matches(away_team_id);
CREATE INDEX idx_matches_date ON matches(match_date);

-- Match events (goals, cards, substitutions)
CREATE TABLE match_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  minute int NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_match ON match_events(match_id);
CREATE INDEX idx_events_player ON match_events(player_id);

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;

-- Teams policies (public read)
CREATE POLICY "select_teams" ON teams FOR SELECT TO anon USING (true);
CREATE POLICY "insert_teams" ON teams FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_teams" ON teams FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_teams" ON teams FOR DELETE TO authenticated USING (true);

-- Players policies
CREATE POLICY "select_players" ON players FOR SELECT TO anon USING (true);
CREATE POLICY "insert_players" ON players FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_players" ON players FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_players" ON players FOR DELETE TO authenticated USING (true);

-- Matches policies
CREATE POLICY "select_matches" ON matches FOR SELECT TO anon USING (true);
CREATE POLICY "insert_matches" ON matches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_matches" ON matches FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_matches" ON matches FOR DELETE TO authenticated USING (true);

-- Match events policies
CREATE POLICY "select_events" ON match_events FOR SELECT TO anon USING (true);
CREATE POLICY "insert_events" ON match_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_events" ON match_events FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_events" ON match_events FOR DELETE TO authenticated USING (true);
