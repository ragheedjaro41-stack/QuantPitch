import { supabase } from "./supabase";
import type { TeamAlias } from "./adminHooks";

export type AliasMatch = {
  teamId: string;
  teamName: string;
  alias: string;
  source: string;
  confidence: number; // 0–100
};

export type AliasResolution =
  | { resolved: true; match: AliasMatch }
  | { resolved: false; rawName: string; suggestions: AliasMatch[] };

export type UnresolvedAlias = {
  id: string;
  raw_name: string;
  source: string;
  suggested_team_id: string | null;
  suggested_team_name: string | null;
  confidence: number;
  status: "pending" | "resolved" | "rejected";
  created_at: string;
};

// Normalise a name for fuzzy matching: lowercase, strip punctuation/FC/AFC suffixes
function normalise(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(fc|afc|sc|utd|united|city|town|athletic|rovers|wanderers|albion)\b/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Compute a simple edit-distance-based confidence score (0–100)
function similarityScore(a: string, b: string): number {
  const na = normalise(a);
  const nb = normalise(b);
  if (na === nb) return 100;
  if (na.includes(nb) || nb.includes(na)) return 85;

  // Token overlap
  const ta = new Set(na.split(" ").filter(Boolean));
  const tb = new Set(nb.split(" ").filter(Boolean));
  const intersection = [...ta].filter((t) => tb.has(t)).length;
  const union = new Set([...ta, ...tb]).size;
  if (union === 0) return 0;
  return Math.round((intersection / union) * 75);
}

// Resolve a provider name to a canonical team_id
// Returns the best match if confidence >= threshold, otherwise enqueues for review
export async function resolveTeamAlias(
  rawName: string,
  source: string,
  confidenceThreshold = 75
): Promise<AliasResolution> {
  // 1. Exact alias lookup
  const { data: exactMatches } = await supabase
    .from("team_aliases")
    .select("*, teams!inner(id, name)")
    .ilike("alias", rawName);

  if (exactMatches && exactMatches.length > 0) {
    const best = exactMatches[0] as TeamAlias & { teams: { id: string; name: string } };
    // Duplicate protection: if multiple teams share this exact alias, flag it
    if (exactMatches.length > 1) {
      await enqueueUnresolved(rawName, source, null, null, 50, "Duplicate alias — multiple teams matched");
    }
    return {
      resolved: true,
      match: {
        teamId: best.team_id,
        teamName: (best as any).teams?.name ?? rawName,
        alias: best.alias,
        source: best.source,
        confidence: 100,
      },
    };
  }

  // 2. Fuzzy match against all team names and existing aliases
  const { data: teams } = await supabase.from("teams").select("id, name, short_name");
  const { data: allAliases } = await supabase.from("team_aliases").select("*");

  type ScoredCandidate = AliasMatch & { _teamName: string };
  const candidates: ScoredCandidate[] = [];

  for (const team of teams || []) {
    const nameScore = similarityScore(rawName, team.name);
    const shortScore = similarityScore(rawName, team.short_name);
    const score = Math.max(nameScore, shortScore);
    if (score > 0) {
      candidates.push({
        teamId: team.id,
        teamName: team.name,
        alias: rawName,
        source,
        confidence: score,
        _teamName: team.name,
      });
    }
  }

  for (const alias of allAliases || []) {
    const score = similarityScore(rawName, alias.alias);
    if (score > 0) {
      const existing = candidates.find((c) => c.teamId === alias.team_id);
      if (existing) {
        existing.confidence = Math.max(existing.confidence, score);
      } else {
        candidates.push({
          teamId: alias.team_id,
          teamName: rawName,
          alias: alias.alias,
          source: alias.source,
          confidence: score,
          _teamName: rawName,
        });
      }
    }
  }

  candidates.sort((a, b) => b.confidence - a.confidence);
  const top = candidates[0];

  if (top && top.confidence >= confidenceThreshold) {
    return { resolved: true, match: top };
  }

  // 3. Unresolvable — enqueue for admin review
  const suggestion = top ?? null;
  await enqueueUnresolved(
    rawName,
    source,
    suggestion?.teamId ?? null,
    suggestion?._teamName ?? null,
    suggestion?.confidence ?? 0
  );

  return {
    resolved: false,
    rawName,
    suggestions: candidates.slice(0, 3),
  };
}

async function enqueueUnresolved(
  rawName: string,
  source: string,
  suggestedTeamId: string | null,
  suggestedTeamName: string | null,
  confidence: number,
  _reason?: string
) {
  // Avoid duplicate queue entries for the same raw_name + source
  const { data: existing } = await supabase
    .from("unresolved_alias_queue")
    .select("id")
    .eq("raw_name", rawName)
    .eq("source", source)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) return; // already queued

  await supabase.from("unresolved_alias_queue").insert({
    raw_name: rawName,
    source,
    suggested_team_id: suggestedTeamId,
    suggested_team_name: suggestedTeamName,
    confidence,
  });
}

// Fetch pending unresolved aliases for admin review
export async function getUnresolvedAliases(): Promise<UnresolvedAlias[]> {
  const { data, error } = await supabase
    .from("unresolved_alias_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as UnresolvedAlias[];
}

// Admin action: accept a suggestion (adds to team_aliases + resolves queue entry)
export async function acceptAlias(
  queueId: string,
  teamId: string,
  rawName: string,
  source: string
) {
  await supabase.from("team_aliases").insert({ team_id: teamId, alias: rawName, source });
  await supabase
    .from("unresolved_alias_queue")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", queueId);
}

// Admin action: reject an alias
export async function rejectAlias(queueId: string) {
  await supabase
    .from("unresolved_alias_queue")
    .update({ status: "rejected", resolved_at: new Date().toISOString() })
    .eq("id", queueId);
}
