import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useMatchResults,
  useSettlementLog,
  usePendingSettlementMatches,
  useSettlementSummary,
  useResultsSyncLog,
  useResultsSyncCooldown,
} from "../../lib/adminHooks";
import { PageHeader, Spinner } from "../../components/ui";
import { CircleCheck as CheckCircle, CircleX as XCircle, CircleAlert as AlertCircle, Clock, Database, ShieldCheck, FileWarning, List, RefreshCw, Loader as Loader2 } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function timeSince(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function statusColor(status: string): string {
  switch (status) {
    case "confirmed":
    case "settled":
    case "completed":
      return "#10B981";
    case "void":
    case "postponed":
    case "cancelled":
    case "abandoned":
      return "#fbbf24";
    case "pending_review":
    case "running":
      return "#f97316";
    case "error":
    case "failed":
      return "#f87171";
    default:
      return "#64748b";
  }
}

function outcomeColor(outcome: string): string {
  switch (outcome) {
    case "home":
    case "over":
    case "yes":
      return "#10B981";
    case "away":
    case "under":
    case "no":
      return "#00D4FF";
    case "draw":
    case "push":
      return "#fbbf24";
    case "void":
      return "#64748b";
    default:
      return "#f87171";
  }
}

function sourceLabel(src: string | null | undefined): { text: string; color: string; bg: string } {
  switch (src) {
    case "api-football":
      return { text: "Provider Verified", color: "#10B981", bg: "#10B98115" };
    case "internal_backfill":
      return { text: "Internal Backfill", color: "#fbbf24", bg: "#fbbf2415" };
    case "manual":
      return { text: "Manual Review", color: "#f97316", bg: "#f9731615" };
    default:
      return { text: src || "Unknown", color: "#64748b", bg: "#64748b15" };
  }
}

function SourceBadge({ source }: { source: string | null | undefined }) {
  const { text, color, bg } = sourceLabel(source);
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ color, backgroundColor: bg, border: `1px solid ${color}30` }}
    >
      {text}
    </span>
  );
}

export default function Settlement() {
  const qc = useQueryClient();
  const { data: summary, isLoading: sL } = useSettlementSummary();
  const { data: results, isLoading: rL } = useMatchResults(30);
  const { data: logs } = useSettlementLog(50);
  const { data: pendingData, isLoading: pL } = usePendingSettlementMatches();
  const { data: syncLogs } = useResultsSyncLog(10);
  const { data: cooldown } = useResultsSyncCooldown();

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ ok: boolean; message: string } | null>(null);

  if (sL || rL || pL) return <Spinner />;

  const pending = pendingData?.pending || [];
  const totalSettled = pendingData?.totalSettled ?? 0;
  const allResults = results || [];
  const allLogs = logs || [];
  const allSyncLogs = syncLogs || [];
  const lastSync = allSyncLogs[0] || null;
  const isOnCooldown = cooldown?.onCooldown ?? false;
  const cooldownRemaining = cooldown?.remaining ?? 0;

  const confirmedResults = allResults.filter((r) => r.match_status === "confirmed");
  const voidResults = allResults.filter((r) =>
    ["postponed", "cancelled", "abandoned", "void"].includes(r.match_status)
  );
  const reviewResults = allResults.filter((r) => r.match_status === "pending_review");

  async function runResultsSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/sync-results`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setSyncResult({ ok: false, message: json.error || `HTTP ${res.status}` });
      } else {
        setSyncResult({
          ok: true,
          message: json.message || `Synced ${json.synced}, settled ${json.settled}`,
        });
      }
    } catch (err) {
      setSyncResult({
        ok: false,
        message: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setSyncing(false);
      qc.invalidateQueries({ queryKey: ["results-sync-log"] });
      qc.invalidateQueries({ queryKey: ["results-sync-cooldown"] });
      qc.invalidateQueries({ queryKey: ["settlement-summary"] });
      qc.invalidateQueries({ queryKey: ["match-results"] });
      qc.invalidateQueries({ queryKey: ["settlement-log"] });
      qc.invalidateQueries({ queryKey: ["pending-settlement-matches"] });
    }
  }

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <PageHeader
        title="Settlement"
        subtitle="Results verification, market settlement, and audit log"
      />

      {/* Results sync controls */}
      <div className="card p-5 mb-8 border border-base-600/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-white">Results Sync</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Fetch confirmed match results from the provider, then run settlement on all markets.
            </p>
          </div>
          <button
            onClick={runResultsSync}
            disabled={syncing || isOnCooldown}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              backgroundColor: syncing || isOnCooldown ? "#1e293b" : "#00D4FF15",
              color: syncing || isOnCooldown ? "#64748b" : "#00D4FF",
              border: `1px solid ${syncing || isOnCooldown ? "#334155" : "#00D4FF40"}`,
              cursor: syncing || isOnCooldown ? "not-allowed" : "pointer",
            }}
          >
            {syncing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            {syncing
              ? "Syncing..."
              : isOnCooldown
              ? `Cooldown ${cooldownRemaining}s`
              : "Run Results Sync"}
          </button>
        </div>

        {/* Sync result banner */}
        {syncResult && (
          <div
            className="px-4 py-2.5 rounded-lg mb-4 text-xs"
            style={{
              backgroundColor: syncResult.ok ? "#10B98110" : "#f8717110",
              border: `1px solid ${syncResult.ok ? "#10B98130" : "#f8717130"}`,
              color: syncResult.ok ? "#10B981" : "#f87171",
            }}
          >
            {syncResult.message}
          </div>
        )}

        {/* Last sync status */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div>
            <p className="text-xs text-slate-500 mb-1">Last Sync</p>
            <p className="text-sm text-white font-mono">
              {lastSync ? timeSince(lastSync.started_at) : "Never"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Status</p>
            <p
              className="text-sm font-bold"
              style={{ color: lastSync ? statusColor(lastSync.status) : "#64748b" }}
            >
              {lastSync ? lastSync.status.toUpperCase() : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Results Synced</p>
            <p className="text-sm text-white font-mono font-bold">
              {lastSync?.synced_count ?? 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Settled / Void</p>
            <p className="text-sm font-mono">
              <span className="text-good font-bold">{lastSync?.settled_count ?? 0}</span>
              <span className="text-slate-500"> / </span>
              <span className="text-warn font-bold">{lastSync?.void_count ?? 0}</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Missing Scores</p>
            <p
              className="text-sm font-mono font-bold"
              style={{ color: (lastSync?.missing_score_count ?? 0) > 0 ? "#f87171" : "#10B981" }}
            >
              {lastSync?.missing_score_count ?? 0}
            </p>
          </div>
        </div>

        {/* Error from last sync */}
        {lastSync?.error_message && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-bad/10 border border-bad/20">
            <p className="text-xs text-bad break-all">{lastSync.error_message}</p>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
        <div className="card p-3 text-center">
          <Database size={14} className="mx-auto mb-1 text-accent" />
          <p className="font-mono text-xl font-bold text-accent">{summary?.total_results ?? 0}</p>
          <p className="text-xs text-slate-600">Results</p>
        </div>
        <div className="card p-3 text-center">
          <CheckCircle size={14} className="mx-auto mb-1 text-good" />
          <p className="font-mono text-xl font-bold text-good">{summary?.confirmed ?? 0}</p>
          <p className="text-xs text-slate-600">Confirmed</p>
        </div>
        <div className="card p-3 text-center">
          <XCircle size={14} className="mx-auto mb-1 text-warn" />
          <p className="font-mono text-xl font-bold text-warn">{summary?.voided ?? 0}</p>
          <p className="text-xs text-slate-600">Void</p>
        </div>
        <div className="card p-3 text-center">
          <AlertCircle size={14} className="mx-auto mb-1" style={{ color: "#f97316" }} />
          <p className="font-mono text-xl font-bold" style={{ color: "#f97316" }}>{summary?.review ?? 0}</p>
          <p className="text-xs text-slate-600">Review</p>
        </div>
        <div className="card p-3 text-center">
          <ShieldCheck size={14} className="mx-auto mb-1 text-good" />
          <p className="font-mono text-xl font-bold text-good">{summary?.settled ?? 0}</p>
          <p className="text-xs text-slate-600">Settled</p>
        </div>
        <div className="card p-3 text-center">
          <FileWarning size={14} className="mx-auto mb-1 text-warn" />
          <p className="font-mono text-xl font-bold text-warn">{summary?.voidLogs ?? 0}</p>
          <p className="text-xs text-slate-600">Void Logs</p>
        </div>
        <div className="card p-3 text-center">
          <XCircle size={14} className="mx-auto mb-1 text-bad" />
          <p className="font-mono text-xl font-bold text-bad">{summary?.errorLogs ?? 0}</p>
          <p className="text-xs text-slate-600">Errors</p>
        </div>
        <div className="card p-3 text-center">
          <Clock size={14} className="mx-auto mb-1 text-slate-400" />
          <p className="font-mono text-xl font-bold text-white">{pending.length}</p>
          <p className="text-xs text-slate-600">Pending</p>
        </div>
      </div>

      {/* Source breakdown */}
      {summary?.by_source && (
        <div className="flex flex-wrap gap-3 mb-8">
          <div className="card p-3 flex items-center gap-3">
            <SourceBadge source="api-football" />
            <span className="font-mono text-lg font-bold text-white">{summary.by_source.provider_verified}</span>
            <span className="text-xs text-slate-500">results</span>
          </div>
          <div className="card p-3 flex items-center gap-3">
            <SourceBadge source="internal_backfill" />
            <span className="font-mono text-lg font-bold text-white">{summary.by_source.internal_backfill}</span>
            <span className="text-xs text-slate-500">results</span>
          </div>
          <div className="card p-3 flex items-center gap-3">
            <SourceBadge source="manual" />
            <span className="font-mono text-lg font-bold text-white">{summary.by_source.manual}</span>
            <span className="text-xs text-slate-500">results</span>
          </div>
        </div>
      )}

      {/* Results Sync History */}
      <h2 className="text-sm font-bold text-white mb-3">Results Sync History</h2>
      <div className="card overflow-hidden mb-8">
        {allSyncLogs.length === 0 ? (
          <div className="p-6 text-center">
            <RefreshCw size={20} className="text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No results sync attempts yet. Click "Run Results Sync" to begin.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-base-700/60 bg-base-700/20">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-28">When</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-24">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-20">Synced</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-20">Settled</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-16">Void</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-20">Missing</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Error</th>
              </tr>
            </thead>
            <tbody>
              {allSyncLogs.map((l) => (
                <tr key={l.id} className="border-b border-base-700/30 last:border-0">
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-slate-400">{timeSince(l.started_at)}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-bold" style={{ color: statusColor(l.status) }}>
                      {l.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-sm font-mono font-bold text-white">{l.synced_count}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-sm font-mono font-bold text-good">{l.settled_count}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-sm font-mono font-bold text-warn">{l.void_count}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className="text-sm font-mono font-bold"
                      style={{ color: l.missing_score_count > 0 ? "#f87171" : "#10B981" }}
                    >
                      {l.missing_score_count}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-slate-500 truncate block max-w-[200px]">
                      {l.error_message || "--"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pending matches */}
      <h2 className="text-sm font-bold text-white mb-3">
        Pending Matches ({pending.length} awaiting results)
      </h2>
      <div className="card overflow-hidden mb-8">
        {pending.length === 0 ? (
          <div className="p-6 text-center">
            <CheckCircle size={20} className="text-good mx-auto mb-2" />
            <p className="text-sm text-slate-400">
              {totalSettled > 0
                ? `All ${totalSettled} completed matches have results`
                : "No completed matches in database"}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-base-700/60 bg-base-700/20">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Match</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-32">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-24">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-28">Status</th>
              </tr>
            </thead>
            <tbody>
              {pending.slice(0, 20).map((m: any) => (
                <tr key={m.id} className="border-b border-base-700/30 last:border-0">
                  <td className="px-4 py-2.5">
                    <span className="text-sm text-white">{m.home_team_name} vs {m.away_team_name}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-slate-400">{new Date(m.match_date).toLocaleDateString()}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-slate-400">{m.competition}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-bold text-warn">NEEDS RESULT</span>
                  </td>
                </tr>
              ))}
              {pending.length > 20 && (
                <tr>
                  <td colSpan={4} className="px-4 py-2.5 text-xs text-slate-500 text-center">
                    ...and {pending.length - 20} more
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Settled matches */}
      <h2 className="text-sm font-bold text-white mb-3">
        Settled Matches ({confirmedResults.length})
      </h2>
      <div className="card overflow-hidden mb-8">
        {confirmedResults.length === 0 ? (
          <div className="p-6 text-center">
            <List size={20} className="text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No matches settled yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-base-700/60 bg-base-700/20">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Match ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-20">FT</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-20">HT</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-16">ET</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-16">Pen</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-20">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-24">Source</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-28">Confirmed</th>
              </tr>
            </thead>
            <tbody>
              {confirmedResults.map((r) => (
                <tr key={r.id} className="border-b border-base-700/30 last:border-0">
                  <td className="px-4 py-2.5">
                    <code className="text-xs text-accent bg-base-700/60 px-1.5 py-0.5 rounded">{r.match_id.slice(0, 8)}</code>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-sm font-mono font-bold text-white">{r.ft_home}-{r.ft_away}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-slate-400 font-mono">{r.ht_home != null ? `${r.ht_home}-${r.ht_away}` : "--"}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-slate-400 font-mono">{r.went_to_et ? `${r.et_home}-${r.et_away}` : "--"}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-slate-400 font-mono">{r.went_to_penalties ? `${r.pen_home}-${r.pen_away}` : "--"}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-slate-400">{r.competition_type}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <SourceBadge source={r.provider_source} />
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-slate-400">{timeSince(r.confirmed_at)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Void / Review */}
      {(voidResults.length > 0 || reviewResults.length > 0) && (
        <>
          <h2 className="text-sm font-bold text-white mb-3">
            Void / Review ({voidResults.length + reviewResults.length})
          </h2>
          <div className="card overflow-hidden mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b border-base-700/60 bg-base-700/20">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Match ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-24">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Notes</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-28">When</th>
                </tr>
              </thead>
              <tbody>
                {[...voidResults, ...reviewResults].map((r) => (
                  <tr key={r.id} className="border-b border-base-700/30 last:border-0">
                    <td className="px-4 py-2.5">
                      <code className="text-xs text-accent bg-base-700/60 px-1.5 py-0.5 rounded">{r.match_id.slice(0, 8)}</code>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-bold" style={{ color: statusColor(r.match_status) }}>
                        {r.match_status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-slate-400">{r.notes || "--"}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-slate-400">{timeSince(r.confirmed_at)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Settlement rules by market */}
      <h2 className="text-sm font-bold text-white mb-3">Settlement Rules by Market</h2>
      <div className="card overflow-hidden mb-8">
        <table className="w-full">
          <thead>
            <tr className="border-b border-base-700/60 bg-base-700/20">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Market</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-24">Settlement</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Rule</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-24">Cup Handling</th>
            </tr>
          </thead>
          <tbody>
            {[
              { key: "h2h", name: "Match Result (1X2)", rule: "FT regulation: home > away = HOME, away > home = AWAY, equal = DRAW" },
              { key: "totals_1.5", name: "Over/Under 1.5", rule: "FT total > 1.5 = OVER, < 1.5 = UNDER" },
              { key: "totals_2.5", name: "Over/Under 2.5", rule: "FT total > 2.5 = OVER, < 2.5 = UNDER" },
              { key: "totals_3.5", name: "Over/Under 3.5", rule: "FT total > 3.5 = OVER, < 3.5 = UNDER" },
              { key: "btts", name: "Both Teams to Score", rule: "Both FT scores > 0 = YES, otherwise = NO" },
            ].map((m) => (
              <tr key={m.key} className="border-b border-base-700/30 last:border-0">
                <td className="px-4 py-2.5">
                  <code className="text-xs text-accent bg-base-700/60 px-1.5 py-0.5 rounded">{m.key}</code>
                  <span className="text-sm text-white ml-2">{m.name}</span>
                </td>
                <td className="px-4 py-2.5"><CheckCircle size={14} className="text-good" /></td>
                <td className="px-4 py-2.5"><span className="text-xs text-slate-400">{m.rule}</span></td>
                <td className="px-4 py-2.5"><span className="text-xs text-slate-400">90min only</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Settlement log by market */}
      {(summary?.by_market || []).length > 0 && (
        <>
          <h2 className="text-sm font-bold text-white mb-3">Settlement by Market</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
            {(summary?.by_market || []).map((m) => (
              <div key={m.market_key} className="card p-3">
                <code className="text-xs text-accent bg-base-700/60 px-1.5 py-0.5 rounded">{m.market_key}</code>
                <div className="flex gap-3 mt-2">
                  <div>
                    <p className="font-mono text-sm font-bold text-good">{m.settled}</p>
                    <p className="text-xs text-slate-600">Settled</p>
                  </div>
                  <div>
                    <p className="font-mono text-sm font-bold text-warn">{m.void}</p>
                    <p className="text-xs text-slate-600">Void</p>
                  </div>
                  <div>
                    <p className="font-mono text-sm font-bold text-bad">{m.error}</p>
                    <p className="text-xs text-slate-600">Error</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Recent settlement log */}
      <h2 className="text-sm font-bold text-white mb-3">Recent Settlement Log</h2>
      <div className="card overflow-hidden mb-8">
        {allLogs.length === 0 ? (
          <div className="p-6 text-center">
            <List size={20} className="text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No settlement entries yet. Run a results sync to begin.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-base-700/60 bg-base-700/20">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-28">Settled</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-20">Market</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-20">Outcome</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-24">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-28">Source</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Reason</th>
              </tr>
            </thead>
            <tbody>
              {allLogs.slice(0, 30).map((l) => (
                <tr key={l.id} className="border-b border-base-700/30 last:border-0">
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-slate-400">{timeSince(l.settled_at)}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <code className="text-xs text-accent bg-base-700/60 px-1 py-0.5 rounded">{l.market_key}</code>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-bold" style={{ color: outcomeColor(l.outcome) }}>
                      {l.outcome.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-bold" style={{ color: statusColor(l.status) }}>
                      {l.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <SourceBadge source={l.provider_source} />
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-slate-400">{l.reason}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Safety rules */}
      <h2 className="text-sm font-bold text-white mb-3">Settlement Safety Rules</h2>
      <div className="card p-5 border border-accent/30 bg-accent/5">
        <div className="flex items-start gap-3">
          <ShieldCheck size={18} className="text-accent shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-xs text-slate-300">
              <strong className="text-white">1. No settlement without confirmed result.</strong>{" "}
              Only matches with match_status = 'confirmed' are settled. All others produce void or pending_review.
            </p>
            <p className="text-xs text-slate-300">
              <strong className="text-white">2. Postponed / cancelled / abandoned = VOID.</strong>{" "}
              All markets are voided immediately. No partial settlement.
            </p>
            <p className="text-xs text-slate-300">
              <strong className="text-white">3. Cup matches: regulation time only.</strong>{" "}
              h2h, totals, and BTTS all settle from ft_home/ft_away (90 min). Extra time and penalties are recorded but never affect standard market outcomes.
            </p>
            <p className="text-xs text-slate-300">
              <strong className="text-white">4. Source tracking.</strong>{" "}
              Every result and settlement entry is labeled by source: <span className="text-good font-semibold">Provider Verified</span> (API-Football live sync), <span className="text-warn font-semibold">Internal Backfill</span> (populated from existing DB scores), or <span style={{ color: "#f97316" }} className="font-semibold">Manual Review</span> (admin-entered). No fake results.
            </p>
            <p className="text-xs text-slate-300">
              <strong className="text-white">5. Missing final score = skip.</strong>{" "}
              If the API reports a match as finished but the score is null, it is logged as missing_score and skipped entirely.
            </p>
            <p className="text-xs text-slate-300">
              <strong className="text-white">6. Rate-limited syncs.</strong>{" "}
              120s cooldown between sync attempts. Protects API quota and prevents duplicate settlement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
