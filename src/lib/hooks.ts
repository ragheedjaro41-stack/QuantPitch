import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { getAllLeaguePlayability, classifyMatchCompetition, buildCupContext, cupWeightModifier, computeCupPickStatus } from "./playability";
import type { PlayabilityResult, TopPlay } from "./playability";
import { buildModelFlags } from "./modelFlags";
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

export function usePrimaryLeague() {
  return useQuery({
    queryKey: ["primary-league"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leagues")
        .select("id, name")
        .eq("is_synthetic", false)
        .eq("name", "Premier League")
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; name: string } | null;
    },
    staleTime: Infinity,
  });
}

export function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .not("league_id", "is", null)
        .order("name");
      if (error) throw error;
      const { data: leagues } = await supabase
        .from("leagues")
        .select("id")
        .eq("is_synthetic", true);
      const syntheticIds = new Set((leagues || []).map((l: { id: string }) => l.id));
      return (data as Team[]).filter((t) => t.league_id && !syntheticIds.has(t.league_id));
    },
  });
}

export function useTeamStats() {
  return useQuery({
    queryKey: ["team-stats"],
    queryFn: async () => {
      const { data: plLeague } = await supabase
        .from("leagues")
        .select("id")
        .eq("name", "Premier League")
        .eq("is_synthetic", false)
        .maybeSingle();
      const plId = plLeague?.id;

      const { data: teams, error: te } = await supabase
        .from("teams")
        .select("*")
        .eq("league_id", plId)
        .order("name");
      if (te) throw te;

      const { data: matches, error: me } = await supabase
        .from("matches")
        .select("*")
        .eq("status", "completed")
        .eq("league_id", plId);
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
        .select("id, name, short_name, primary_color, logo_url")
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
      const { data: plLeague } = await supabase
        .from("leagues")
        .select("id")
        .eq("name", "Premier League")
        .eq("is_synthetic", false)
        .maybeSingle();
      const plId = plLeague?.id;

      const { data: plTeams } = await supabase
        .from("teams")
        .select("id, name, short_name, primary_color, logo_url")
        .eq("league_id", plId);

      const teamMap = new Map((plTeams || []).map((t) => [t.id, t]));
      const plTeamIds = [...teamMap.keys()];

      const { data: players, error } = await supabase
        .from("players")
        .select("*")
        .in("team_id", plTeamIds)
        .order("rating", { ascending: false });
      if (error) throw error;

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
      const { data: plLeague } = await supabase
        .from("leagues")
        .select("id")
        .eq("name", "Premier League")
        .eq("is_synthetic", false)
        .maybeSingle();
      const plId = plLeague?.id;

      const { data: matches, error } = await supabase
        .from("matches")
        .select("*")
        .eq("league_id", plId)
        .order("match_date", { ascending: false });
      if (error) throw error;

      const teamIds = new Set<string>();
      (matches as Match[]).forEach((m) => {
        teamIds.add(m.home_team_id);
        teamIds.add(m.away_team_id);
      });

      const { data: teams } = await supabase
        .from("teams")
        .select("id, name, short_name, primary_color, logo_url")
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
        .select("id, name, short_name, primary_color, city, stadium, logo_url")
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
      const { data: plLeague } = await supabase
        .from("leagues")
        .select("id")
        .eq("name", "Premier League")
        .eq("is_synthetic", false)
        .maybeSingle();
      const plId = plLeague?.id;

      const [teamsR, playersR, matchesR] = await Promise.all([
        supabase.from("teams").select("*").eq("league_id", plId),
        supabase.from("players").select("*").eq("competition", "league"),
        supabase.from("matches").select("*").eq("status", "completed").eq("league_id", plId),
      ]);

      const teams = teamsR.data as Team[];
      const players = (playersR.data as Player[]).filter((p) =>
        teams.some((t) => t.id === p.team_id)
      );
      const matches = matchesR.data as Match[];

      const totalGoals = matches.reduce(
        (sum, m) => sum + m.home_score + m.away_score,
        0
      );
      const topScorers = [...players]
        .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
        .slice(0, 5);

      const maxRound = matches.reduce((max, m) => Math.max(max, m.round), 0);
      const roundCount = Math.min(maxRound, 38);
      const goalsPerRound = Array.from({ length: roundCount }, (_, i) => {
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
          players.length > 0
            ? players.reduce((sum, p) => sum + p.rating, 0) / players.length
            : 0,
      };
    },
  });
}

export function useTopPlays() {
  return useQuery({
    queryKey: ["top-plays"],
    queryFn: async () => {
      // 1. Evaluate live playability for all leagues (picks status + safety rules + coverage)
      const leaguePlayability = await getAllLeaguePlayability();

      // 2. Load prediction rules
      const { data: rulesData, error: re } = await supabase
        .from("prediction_rules")
        .select("*")
        .eq("active", true)
        .contains("competition_types", ["domestic_league"]);
      if (re) throw re;
      const predictionRules = rulesData as PredictionRule[];

      // 3. Fetch recent matches (all competitions, we'll hard-filter below)
      const { data: matchesData, error: me } = await supabase
        .from("matches")
        .select("*")
        .eq("status", "completed")
        .not("league_id", "is", null)
        .order("match_date", { ascending: false })
        .limit(100);
      if (me) throw me;
      const allMatches = matchesData as Match[];

      // 4. Hard safety gate: only LIVE_PICK leagues pass
      // Block: synthetic/demo, no live odds, blocked by safety rules, Tier 4, missing settlement
      const liveMatches = allMatches.filter((m) => {
        if (!m.league_id) return false;
        const playability = leaguePlayability.get(m.league_id);
        if (!playability) return false;
        // Must be LIVE_PICK to appear in Top Plays
        if (playability.pick_status !== "LIVE_PICK") return false;
        // Hard block Tier 4
        if (playability.tier >= 4) return false;
        return true;
      });

      // 5. Load leagues for qualifying matches
      const leagueIds = [...new Set(liveMatches.map((m) => m.league_id!))];
      const leagueMap = new Map<string, any>();
      if (leagueIds.length > 0) {
        const { data: leaguesData } = await supabase
          .from("leagues")
          .select("*")
          .in("id", leagueIds);
        (leaguesData || []).forEach((l) => leagueMap.set(l.id, l));
      }

      if (liveMatches.length === 0) return [] as TopPlay[];

      // 6. Load teams
      const teamIds = new Set<string>();
      liveMatches.forEach((m) => { teamIds.add(m.home_team_id); teamIds.add(m.away_team_id); });
      const { data: teamsData } = await supabase
        .from("teams").select("id, name, short_name, primary_color").in("id", [...teamIds]);
      const teamMap = new Map((teamsData || []).map((t) => [t.id, t]));

      // 7. Build team form index (pts in last 5 games)
      const formPts = new Map<string, number>();
      for (const tid of teamIds) {
        const teamMatches = liveMatches
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

      // 8. Prediction rule weight modifier by competition types
      const getRuleModifier = (competitionTypes: string[]) => {
        let modifier = 1.0;
        for (const rule of predictionRules) {
          if (rule.competition_types.some((ct: string) => competitionTypes.includes(ct))) {
            modifier *= rule.weight_modifier;
          }
        }
        return modifier;
      };

      // 9. Score each match, apply cup context where applicable
      const plays: TopPlay[] = liveMatches.slice(0, 15).map((m) => {
        const league = leagueMap.get(m.league_id!);
        const playability = leaguePlayability.get(m.league_id!) as PlayabilityResult;
        const homeTeam = teamMap.get(m.home_team_id);
        const awayTeam = teamMap.get(m.away_team_id);

        const competitionTypes = classifyMatchCompetition(m);
        const isCup = competitionTypes.includes("cup") || competitionTypes.includes("knockout");

        // Cup context (null for regular league games)
        const cupCtx = isCup
          ? buildCupContext({ stage: m.stage, leg: undefined, is_neutral_venue: undefined })
          : null;
        const cupMod = cupCtx ? cupWeightModifier(cupCtx) : 1.0;
        const ruleModifier = getRuleModifier(competitionTypes);
        const totalModifier = ruleModifier * cupMod;

        const homeForm = formPts.get(m.home_team_id) ?? 0;
        const awayForm = formPts.get(m.away_team_id) ?? 0;
        const homeAdv = cupCtx?.is_neutral_venue ? 1.0 : 1.15;
        const homeScore = homeForm * homeAdv * totalModifier;
        const awayScore = awayForm * totalModifier;
        const diff = homeScore - awayScore;

        // Pressure in finals/semis increases draw probability
        const drawThreshold = cupCtx?.pressure_flag ? 3 : 2;
        let pick: "home" | "away" | "draw";
        let pickLabel: string;
        if (Math.abs(diff) < drawThreshold) { pick = "draw"; pickLabel = "Draw"; }
        else if (diff > 0) { pick = "home"; pickLabel = homeTeam?.short_name ?? "Home"; }
        else { pick = "away"; pickLabel = awayTeam?.short_name ?? "Away"; }

        const tierCap = playability.confidence_cap ?? 70;
        const rawConfidence = Math.min(60 + Math.abs(diff) * 3, 100);
        const confidence = Math.min(rawConfidence, tierCap);
        const oddsCov = league?.odds_coverage ?? 0;
        const statsCov = league?.stats_coverage ?? 0;

        // LIVE_PICK: value score uses real odds/stats coverage
        // NOTE: since no real odds feed exists yet, oddsCov will be 0 for all leagues
        // and LIVE_PICK leagues will not appear until has_live_odds=true is set on the league
        const valueScore = Math.round(
          confidence * (Math.max(oddsCov, 1) / 100) * (Math.max(statsCov, 1) / 100) * totalModifier * 100
        );

        // Cup sample size gate: block cup picks if insufficient historical data
        const isCupPick = cupCtx !== null;
        const cupSample = isCupPick ? (cupCtx.went_to_et ? 20 : 0) : null; // placeholder: 0 sample until real data
        const cupGate = isCupPick
          ? computeCupPickStatus(cupSample, playability.pick_status)
          : { pick_status: playability.pick_status, reason: null };

        const finalPickStatus = cupGate.pick_status;
        const modelFlags = buildModelFlags({
          has_live_odds: playability.has_live_odds,
          has_xg: false,
          has_stats: statsCov >= 50,
          has_settlement: statsCov >= 30,
          has_trusted_market: playability.has_live_odds,
          cup_historical_sample: cupSample,
        });

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
          tier: playability.tier,
          competition_type: league?.competition_type ?? "domestic_league",
          odds_coverage: oddsCov,
          stats_coverage: statsCov,
          confidence_cap: tierCap,
          pick,
          pick_label: pickLabel,
          pick_status: finalPickStatus,
          block_reason: cupGate.reason,
          value_score: finalPickStatus === "LIVE_PICK" ? valueScore : 0,
          home_form_pts: homeForm,
          away_form_pts: awayForm,
          cup_context: cupCtx,
          model_flags: modelFlags,
        } satisfies TopPlay;
      });

      return plays.sort((a, b) => b.value_score - a.value_score);
    },
  });
}
