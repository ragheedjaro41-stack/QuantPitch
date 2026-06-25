export type Team = {
  id: string;
  name: string;
  short_name: string;
  city: string;
  stadium: string;
  founded: number;
  primary_color: string;
  logo_url: string | null;
  competition: string;
};

export type Player = {
  id: string;
  team_id: string;
  name: string;
  position: string;
  jersey_number: number;
  nationality: string;
  age: number;
  height_cm: number | null;
  weight_kg: number | null;
  goals: number;
  assists: number;
  appearances: number;
  rating: number;
  photo_url: string | null;
  competition: string;
};

export type Match = {
  id: string;
  home_team_id: string;
  away_team_id: string;
  match_date: string;
  venue: string;
  home_score: number;
  away_score: number;
  status: string;
  round: number;
  competition: string;
  stage: string | null;
  group_name: string | null;
};

export type MatchEvent = {
  id: string;
  match_id: string;
  player_id: string | null;
  team_id: string;
  event_type: string;
  minute: number;
  description: string | null;
};

export type TeamWithStats = Team & {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
};

export type PlayerWithTeam = Player & {
  team: Pick<Team, "id" | "name" | "short_name" | "primary_color">;
};

export type MatchWithTeams = Match & {
  home_team: Pick<Team, "id" | "name" | "short_name" | "primary_color">;
  away_team: Pick<Team, "id" | "name" | "short_name" | "primary_color">;
};

export type MatchEventWithPlayer = MatchEvent & {
  player: Pick<Player, "id" | "name"> | null;
};

export type WCGroup = {
  name: string;
  teams: TeamWithStats[];
};

export type WCKnockoutMatch = MatchWithTeams & {
  stage: string;
};
