import { supabase } from "./supabase";
import type { League, SafetyRule, DataCoverage } from "./adminHooks";

export type PlayabilityResult = {
  playable: boolean;
  reason: string | null;
  confidence_cap: number | null;
  tier: number;
  league_id: string;
  league_name: string;
};

export type TopPlay = {
  match_id: string;
  home_team_name: string;
  away_team_name: string;
  home_team_id: string;
  away_team_id: string;
  match_date: string;
  venue: string;
  league_id: string;
  league_name: string;
  league_short_name: string;
  tier: number;
  competition_type: string;
  odds_coverage: number;
  stats_coverage: number;
  confidence_cap: number;
  pick: "home" | "away" | "draw";
  pick_label: string;
  value_score: number;
  home_form_pts: number;
  away_form_pts: number;
};

// Compute live playability for a league against safety rules and coverage data
export async function computeLeaguePlayability(
  league: League,
  safetyRules: SafetyRule[],
  coverage: DataCoverage | undefined
): Promise<PlayabilityResult> {
  // Hard block: tier 4+ is non-playable per safety rules
  const tierRules = safetyRules.filter((r) => r.active && r.tier_applies_to.includes(league.tier));

  for (const rule of tierRules) {
    const oddsCov = coverage?.odds_coverage ?? league.odds_coverage;
    const statsCov = coverage?.stats_coverage ?? league.stats_coverage;

    if (oddsCov < rule.min_odds_coverage) {
      return {
        playable: false,
        reason: `${rule.rule_name}: odds coverage ${oddsCov}% < required ${rule.min_odds_coverage}%`,
        confidence_cap: null,
        tier: league.tier,
        league_id: league.id,
        league_name: league.name,
      };
    }
    if (statsCov < rule.min_stats_coverage) {
      return {
        playable: false,
        reason: `${rule.rule_name}: stats coverage ${statsCov}% < required ${rule.min_stats_coverage}%`,
        confidence_cap: null,
        tier: league.tier,
        league_id: league.id,
        league_name: league.name,
      };
    }
  }

  // Thin league: cap confidence at 70%
  const confidenceCap = league.tier >= 3 ? 70 : league.tier === 2 ? 85 : 95;

  return {
    playable: league.playable,
    reason: league.playable ? null : "Marked non-playable in registry",
    confidence_cap: confidenceCap,
    tier: league.tier,
    league_id: league.id,
    league_name: league.name,
  };
}

// Fetch playable league IDs using live safety rule evaluation
export async function getPlayableLeagueIds(): Promise<Set<string>> {
  const [leaguesR, safetyR, coverageR] = await Promise.all([
    supabase.from("leagues").select("*"),
    supabase.from("safety_rules").select("*").eq("active", true),
    supabase.from("data_coverage").select("*").eq("entity_type", "league"),
  ]);

  if (leaguesR.error) throw leaguesR.error;
  if (safetyR.error) throw safetyR.error;

  const leagues = leaguesR.data as League[];
  const safetyRules = safetyR.data as SafetyRule[];
  const coverageMap = new Map(
    ((coverageR.data as DataCoverage[]) || []).map((c) => [c.entity_id, c])
  );

  const playableIds = new Set<string>();
  for (const league of leagues) {
    const coverage = coverageMap.get(league.id);
    const result = await computeLeaguePlayability(league, safetyRules, coverage);
    if (result.playable) playableIds.add(league.id);
  }
  return playableIds;
}

// Classify competition context for a match (used by prediction rules)
export function classifyMatchCompetition(match: {
  competition: string;
  stage?: string | null;
}): string[] {
  const types: string[] = [];
  if (match.competition === "worldcup") types.push("international", "cup");
  else if (match.competition === "league") types.push("domestic_league");
  if (match.stage && match.stage !== "group") types.push("knockout");
  return types;
}
