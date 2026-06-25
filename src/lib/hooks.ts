import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { getPlayableLeagueIds, classifyMatchCompetition } from "./playability";
import type { PredictionRule } from "./adminHooks";
import type {
  Team,
  Player,
  Match,
  MatchEvent,
  TeamWithStats,
  PlayerWithTeam,
  MatchWithTeams,
  MatchEventWithPlayer,
  WCGroup,
  WCKnockoutMatch,
} from "../types";

export function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Team[];
    },
  });
}

export function useTeamStats() {
  return useQuery({
    queryKey: ["team-stats"],
    queryFn: async () => {
      const { data: teams, error: te } = await supabase
        .from("teams")
        .select("*")
        .order("name");
      if (te) throw te;

      const { data: matches, error: me } = await supabase
        .from("matches")
        .select("*")
        .eq("status", "completed");
      if (me) throw me;

      const stats: TeamWithStats[] = (teams as Team[]).map((t) => {
        const teamMatches = (matches as Match[]).filter(
          (m) => m.home_team_id === t.id || m.away_team_id === t.id
        );
        let won = 0, drawn = 0, lost = 0, gf = 0, ga = 0;
        for (const m of teamMatches) {
          const isHome = m.home_team_id === t.id;
          const scored = isHome ? m.home_score : m.away_score;
          const conceded = isHome ? m.away_score : m.home_score;
          gf += scored;
          ga += conceded;
          if (scored > conceded) won++;
          else if (scored === conceded) drawn++;
          else lost++;
        }
        return {
          ...t,
          played: teamMatches.length,
          won, drawn, lost,
          goals_for: gf,
          goals_against: ga,
          goal_diff: gf - ga,
          points: won * 3 + drawn,
        };
      });
      return stats.sort((a, b) => b.points - a.points || b.goal_diff - a.goal_diff);
    },
  });
}

export function useTeam(id: string | undefined) {
  return useQuery({
    queryKey: ["team", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Team;
    },
    enabled: !!id,
  });
}

export function useTeamPlayers(teamId: string | undefined) {
  return useQuery({
    queryKey: ["team-players", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("team_id", teamId)
        .order("jersey_number");
      if (error) throw error;
      return data as Player[];
    },
    enabled: !!teamId,
  });
}

export function useTeamMatches(teamId: string | undefined) {
  return useQuery({
    queryKey: ["team-matches", teamId],
    queryFn: async () => {
      const { data: matches, error } = await supabase
        .from("matches")
        .select("*")
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .order("match_date", { ascending: false });
      if (error) throw error;

      const teamIds = new Set<string>();
      (matches as Match[]).forEach((m) => {
        teamIds.add(m.home_team_id);
        teamIds.add(m.away_team_id);
      });

      const { data: teams } = await supabase
        .from("teams")
        .select("id, name, short_name, primary_color")
        .in("id", [...teamIds]);

      const teamMap = new Map((teams || []).map((t) => [t.id, t]));
      return (matches as Match[]).map((m) => ({
        ...m,
        home_team: teamMap.get(m.home_team_id),
        away_team: teamMap.get(m.away_team_id),
      })) as MatchWithTeams[];
    },
    enabled: !!teamId,
  });
}

export function usePlayers() {
  return useQuery({
    queryKey: ["players"],
    queryFn: async () => {
      const { data: players, error } = await supabase
        .from("players")
        .select("*")
        .order("rating", { ascending: false });
      if (error) throw error;

      const teamIds = [...new Set((players as Player[]).map((p) => p.team_id))];
      const { data: teams } = await supabase
        .from("teams")
        .select("id, name, short_name, primary_color")
        .in("id", teamIds);

      const teamMap = new Map((teams || []).map((t) => [t.id, t]));
      return (players as Player[]).map((p) => ({
        ...p,
        team: teamMap.get(p.team_id),
      })) as PlayerWithTeam[];
    },
  });
}

export function usePlayer(id: string | undefined) {
  return useQuery({
    queryKey: ["player", id],
    queryFn: async () => {
      const { data: player, error } = await supabase
        .from("players")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;

      const { data: team } = await supabase
        .from("teams")
        .select("id, name, short_name, primary_color")
        .eq("id", (player as Player).team_id)
        .single();

      return { ...(player as Player), team } as PlayerWithTeam;
    },
    enabled: !!id,
  });
}

export function useMatches() {
  return useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const { data: matches, error } = await supabase
        .from("matches")
        .select("*")
        .order("match_date", { ascending: false });
      if (error) throw error;

      const teamIds = new Set<string>();
      (matches as Match[]).forEach((m) => {
        teamIds.add(m.home_team_id);
        teamIds.add(m.away_team_id);
      });

      const { data: teams } = await supabase
        .from("teams")
        .select("id, name, short_name, primary_color")
        .in("id", [...teamIds]);

      const teamMap = new Map((teams || []).map((t) => [t.id, t]));
      return (matches as Match[]).map((m) => ({
        ...m,
        home_team: teamMap.get(m.home_team_id),
        away_team: teamMap.get(m.away_team_id),
      })) as MatchWithTeams[];
    },
  });
}

export function useMatch(id: string | undefined) {
  return useQuery({
    queryKey: ["match", id],
    queryFn: async () => {
      const { data: match, error } = await supabase
        .from("matches")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;

      const { data: teams } = await supabase
        .from("teams")
        .select("id, name, short_name, primary_color, city, stadium")
        .in("id", [match.home_team_id, match.away_team_id]);

      const teamMap = new Map((teams || []).map((t) => [t.id, t]));
      return {
        ...(match as Match),
        home_team: teamMap.get(match.home_team_id),
        away_team: teamMap.get(match.away_team_id),
      } as MatchWithTeams;
    },
    enabled: !!id,
  });
}

export function useMatchEvents(matchId: string | undefined) {
  return useQuery({
    queryKey: ["match-events", matchId],
    queryFn: async () => {
      const { data: events, error } = await supabase
        .from("match_events")
        .select("*")
        .eq("match_id", matchId)
        .order("minute");
      if (error) throw error;

      const playerIds = [
        ...new Set(
          (events as MatchEvent[])
            .map((e) => e.player_id)
            .filter(Boolean) as string[]
        ),
      ];

      let playerMap = new Map<string, { id: string; name: string }>();
      if (playerIds.length > 0) {
        const { data: players } = await supabase
          .from("players")
          .select("id, name")
          .in("id", playerIds);
        playerMap = new Map((players || []).map((p) => [p.id, p]));
      }

      return (events as MatchEvent[]).map((e) => ({
        ...e,
        player: e.player_id ? playerMap.get(e.player_id) : null,
      })) as MatchEventWithPlayer[];
    },
    enabled: !!matchId,
  });
}

export function useWorldCupGroups() {
  return useQuery({
    queryKey: ["wc-groups"],
    queryFn: async () => {
      const { data: teams, error: te } = await supabase
        .from("teams")
        .select("*")
        .eq("competition", "worldcup");
      if (te) throw te;

      const { data: matches, error: me } = await supabase
        .from("matches")
        .select("*")
        .eq("competition", "worldcup")
        .eq("stage", "group")
        .eq("status", "completed");
      if (me) throw me;

      const groupNames = ["A", "B", "C", "D"];
      const groups: WCGroup[] = groupNames.map((g) => {
        const groupMatches = (matches as Match[]).filter((m) => m.group_name === g);
        const teamIds = new Set<string>();
        groupMatches.forEach((m) => {
          teamIds.add(m.home_team_id);
          teamIds.add(m.away_team_id);
        });
        const groupTeams = (teams as Team[]).filter((t) => teamIds.has(t.id));

        const stats: TeamWithStats[] = groupTeams.map((t) => {
          const tm = groupMatches.filter(
            (m) => m.home_team_id === t.id || m.away_team_id === t.id
          );
          let won = 0, drawn = 0, lost = 0, gf = 0, ga = 0;
          for (const m of tm) {
            const isHome = m.home_team_id === t.id;
            const scored = isHome ? m.home_score : m.away_score;
            const conceded = isHome ? m.away_score : m.home_score;
            gf += scored; ga += conceded;
            if (scored > conceded) won++;
            else if (scored === conceded) drawn++;
            else lost++;
          }
          return {
            ...t,
            played: tm.length,
            won, drawn, lost,
            goals_for: gf,
            goals_against: ga,
            goal_diff: gf - ga,
            points: won * 3 + drawn,
          };
        });
        return {
          name: g,
          teams: stats.sort((a, b) => b.points - a.points || b.goal_diff - a.goal_diff),
        };
      });
      return groups;
    },
  });
}

export function useWorldCupKnockout() {
  return useQuery({
    queryKey: ["wc-knockout"],
    queryFn: async () => {
      const { data: matches, error: me } = await supabase
        .from("matches")
        .select("*")
        .eq("competition", "worldcup")
        .neq("stage", "group")
        .order("match_date");
      if (me) throw me;

      const teamIds = new Set<string>();
      (matches as Match[]).forEach((m) => {
        teamIds.add(m.home_team_id);
        teamIds.add(m.away_team_id);
      });

      const { data: teams } = await supabase
        .from("teams")
        .select("id, name, short_name, primary_color")
        .in("id", [...teamIds]);

      const teamMap = new Map((teams || []).map((t) => [t.id, t]));
      return (matches as Match[]).map((m) => ({
        ...m,
        home_team: teamMap.get(m.home_team_id),
        away_team: teamMap.get(m.away_team_id),
      })) as WCKnockoutMatch[];
    },
  });
}

export function useWorldCupTopScorers() {
  return useQuery({
    queryKey: ["wc-top-scorers"],
    queryFn: async () => {
      const { data: players, error } = await supabase
        .from("players")
        .select("*")
        .eq("competition", "worldcup")
        .order("goals", { ascending: false })
        .limit(10);
      if (error) throw error;

      const teamIds = [...new Set((players as Player[]).map((p) => p.team_id))];
      const { data: teams } = await supabase
        .from("teams")
        .select("id, name, short_name, primary_color")
        .in("id", teamIds);

      const teamMap = new Map((teams || []).map((t) => [t.id, t]));
      return (players as Player[]).map((p) => ({
        ...p,
        team: teamMap.get(p.team_id),
      })) as PlayerWithTeam[];
    },
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [teamsR, playersR, matchesR, eventsR] = await Promise.all([
        supabase.from("teams").select("*"),
        supabase.from("players").select("*"),
        supabase.from("matches").select("*").eq("status", "completed"),
        supabase.from("match_events").select("*"),
      ]);

      const teams = teamsR.data as Team[];
      const players = playersR.data as Player[];
      const matches = matchesR.data as Match[];
      const events = eventsR.data as MatchEvent[];

      const totalGoals = events.filter((e) => e.event_type === "goal").length;
      const topScorers = [...players]
        .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
        .slice(0, 5);

      const goalsPerRound = Array.from({ length: 5 }, (_, i) => {
        const round = i + 1;
        const roundMatches = matches.filter((m) => m.round === round);
        const roundGoals = roundMatches.reduce(
          (sum, m) => sum + m.home_score + m.away_score,
          0
        );
        return { round: `R${round}`, goals: roundGoals };
      });

      return {
        teamCount: teams.length,
        playerCount: players.length,
        matchCount: matches.length,
        totalGoals,
        topScorers,
        goalsPerRound,
        avgRating:
          players.reduce((sum, p) => sum + p.rating, 0) / players.length,
      };
    },
  });
}

export function useTopPlays() {
  return useQuery({
    queryKey: ["top-plays"],
    queryFn: async () => {
      // 1. Get live playable league IDs via safety rule evaluation
      const playableLeagueIds = await getPlayableLeagueIds();

      // 2. Load prediction rules for domestic league competition type
      const { data: rulesData, error: re } = await supabase
        .from("prediction_rules")
        .select("*")
        .eq("active", true)
        .contains("competition_types", ["domestic_league"]);
      if (re) throw re;
      const predictionRules = rulesData as PredictionRule[];

      // 3. Fetch upcoming/scheduled matches in playable leagues
      const { data: matchesData, error: me } = await supabase
        .from("matches")
        .select("*")
        .eq("competition", "league")
        .eq("status", "completed")
        .not("league_id", "is", null)
        .order("match_date", { ascending: false })
        .limit(50);
      if (me) throw me;
      const matches = matchesData as Match[];

      // 4. Filter to only matches in playable leagues
      const playableMatches = matches.filter(
        (m) => m.league_id && playableLeagueIds.has(m.league_id)
      );

      if (playableMatches.length === 0) return [];

      // 5. Load leagues for playable matches
      const leagueIds = [...new Set(playableMatches.map((m) => m.league_id!))];
      const { data: leaguesData } = await supabase
        .from("leagues")
        .select("*")
        .in("id", leagueIds);
      const leagueMap = new Map((leaguesData || []).map((l) => [l.id, l]));

      // 6. Load teams
      const teamIds = new Set<string>();
      playableMatches.forEach((m) => {
        teamIds.add(m.home_team_id);
        teamIds.add(m.away_team_id);
      });
      const { data: teamsData } = await supabase
        .from("teams")
        .select("id, name, short_name, primary_color")
        .in("id", [...teamIds]);
      const teamMap = new Map((teamsData || []).map((t) => [t.id, t]));

      // 7. Build team form index (pts in last 5 matches)
      const formPts = new Map<string, number>();
      for (const tid of teamIds) {
        const teamMatches = playableMatches
          .filter((m) => m.home_team_id === tid || m.away_team_id === tid)
          .slice(0, 5);
        let pts = 0;
        for (const m of teamMatches) {
          const isHome = m.home_team_id === tid;
          const scored = isHome ? m.home_score : m.away_score;
          const conceded = isHome ? m.away_score : m.home_score;
          if (scored > conceded) pts += 3;
          else if (scored === conceded) pts += 1;
        }
        formPts.set(tid, pts);
      }

      // 8. Apply prediction rules: compute weight modifier per match
      const getRuleModifier = (competitionTypes: string[]) => {
        let modifier = 1.0;
        for (const rule of predictionRules) {
          const overlaps = rule.competition_types.some((ct) => competitionTypes.includes(ct));
          if (overlaps) modifier *= rule.weight_modifier;
        }
        return modifier;
      };

      // 9. Score each match and pick the value play
      const plays = playableMatches.slice(0, 10).map((m) => {
        const league = leagueMap.get(m.league_id!);
        const homeTeam = teamMap.get(m.home_team_id);
        const awayTeam = teamMap.get(m.away_team_id);
        const competitionTypes = classifyMatchCompetition(m);
        const modifier = getRuleModifier(competitionTypes);

        const homeForm = formPts.get(m.home_team_id) ?? 0;
        const awayForm = formPts.get(m.away_team_id) ?? 0;
        const homeAdv = 1.15; // home field factor
        const homeScore = homeForm * homeAdv * modifier;
        const awayScore = awayForm * modifier;
        const diff = homeScore - awayScore;

        let pick: "home" | "away" | "draw";
        let pickLabel: string;
        if (Math.abs(diff) < 2) { pick = "draw"; pickLabel = "Draw"; }
        else if (diff > 0) { pick = "home"; pickLabel = homeTeam?.short_name ?? "Home"; }
        else { pick = "away"; pickLabel = awayTeam?.short_name ?? "Away"; }

        const tierCap = league ? (league.tier === 1 ? 95 : league.tier === 2 ? 85 : 70) : 70;
        const rawConfidence = Math.min(60 + Math.abs(diff) * 3, 100);
        const confidence = Math.min(rawConfidence, tierCap);
        const oddsCov = league?.odds_coverage ?? 0;
        const statsCov = league?.stats_coverage ?? 0;
        const valueScore = Math.round(confidence * (oddsCov / 100) * (statsCov / 100) * modifier * 100);

        return {
          match_id: m.id,
          home_team_name: homeTeam?.name ?? "Unknown",
          away_team_name: awayTeam?.name ?? "Unknown",
          home_team_id: m.home_team_id,
          away_team_id: m.away_team_id,
          match_date: m.match_date,
          venue: m.venue,
          league_id: m.league_id!,
          league_name: league?.name ?? "Unknown",
          league_short_name: league?.short_name ?? "?",
          tier: league?.tier ?? 0,
          competition_type: league?.competition_type ?? "domestic_league",
          odds_coverage: oddsCov,
          stats_coverage: statsCov,
          confidence_cap: tierCap,
          pick,
          pick_label: pickLabel,
          value_score: valueScore,
          home_form_pts: homeForm,
          away_form_pts: awayForm,
        };
      });

      return plays.sort((a, b) => b.value_score - a.value_score);
    },
  });
}
