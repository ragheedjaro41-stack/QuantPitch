import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useApiFootballSyncLog,
  useApiFootballSyncCooldown,
  useProviderMissingData,
  useApiFootballSummary,
} from "../../lib/adminHooks";
import { PageHeader, Spinner } from "../../components/ui";
import { RefreshCw, Loader as Loader2, CircleCheck as CheckCircle, CircleX as XCircle, CircleAlert as AlertCircle, Key, ShieldAlert, Database, Users, Trophy, ChartBar as BarChart2, TriangleAlert as AlertTriangle } from "lucide-react";

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
    case "completed":
      return "#10B981";
    case "running":
      return "#f97316";
    case "failed":
      return "#f87171";
    case "never":
      return "#64748b";
    default:
      return "#64748b";
  }
}

type SyncType = "fixtures" | "teams" | "standings";

export default function ApiFootball() {
  const qc = useQueryClient();
  const { data: summary, isLoading: sL } = useApiFootballSummary();
  const { data: syncLogs, isLoading: lL } = useApiFootballSyncLog(20);
  const { data: missingData } = useProviderMissingData();
  const { data: fixturesCd } = useApiFootballSyncCooldown("fixtures");
  const { data: teamsCd } = useApiFootballSyncCooldown("teams");
  const { data: standingsCd } = useApiFootballSyncCooldown("standings");

  const [syncing, setSyncing] = useState<SyncType | null>(null);
  const [syncResult, setSyncResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  if (sL || lL) return <Spinner />;

  const cooldowns: Record<SyncType, { onCooldown: boolean; remaining: number }> = {
    fixtures: fixturesCd || { onCooldown: false, remaining: 0 },
    teams: teamsCd || { onCooldown: false, remaining: 0 },
    standings: standingsCd || { onCooldown: false, remaining: 0 },
  };

  const allSyncLogs = syncLogs || [];
  const allMissing = missingData || [];

  async function runSync(type: SyncType) {
    setSyncing(type);
    setSyncResult(null);
    const funcName =
      type === "fixtures"
        ? "sync-fixtures"
        : type === "teams"
        ? "sync-teams"
        : "sync-standings";
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/${funcName}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          type === "standings" ? { include_stats: true } : {}
        ),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setSyncResult({
          ok: false,
          message: json.error || `HTTP ${res.status}`,
        });
      } else {
        setSyncResult({
          ok: true,
          message: json.message || `Synced ${json.synced}`,
        });
      }
    } catch (err) {
      setSyncResult({
        ok: false,
        message: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setSyncing(null);
      qc.invalidateQueries({ queryKey: ["api-football-sync-log"] });
      qc.invalidateQueries({ queryKey: ["api-football-cooldown"] });
      qc.invalidateQueries({ queryKey: ["api-football-summary"] });
      qc.invalidateQueries({ queryKey: ["provider-missing-data"] });
    }
  }

  function SyncButton({
    type,
    label,
    icon: Icon,
  }: {
    type: SyncType;
    label: string;
    icon: typeof RefreshCw;
  }) {
    const cd = cooldowns[type];
    const isSyncing = syncing === type;
    const disabled = isSyncing || cd.onCooldown || syncing !== null;
    return (
      <button
        onClick={() => runSync(type)}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
        style={{
          backgroundColor: disabled ? "#1e293b" : "#00D4FF10",
          color: disabled ? "#64748b" : "#00D4FF",
          border: `1px solid ${disabled ? "#334155" : "#00D4FF40"}`,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        {isSyncing ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Icon size={12} />
        )}
        {isSyncing
          ? "Syncing..."
          : cd.onCooldown
          ? `${cd.remaining}s`
          : label}
      </button>
    );
  }

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
      <PageHeader
        title="API-Football"
        subtitle="Fixtures, teams, standings, and stats from API-Football"
      />

      {/* Key role warning */}
      <div className="card p-5 mb-6 border border-warn/30 bg-warn/5">
        <div className="flex items-start gap-3">
          <ShieldAlert size={16} className="text-warn shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-xs text-slate-300">
              <strong className="text-white">API_FOOTBALL_KEY</strong> = Fixtures,
              results, and stats provider. Without it, no data is fetched and no
              fake data is created.
            </p>
            <p className="text-xs text-slate-300">
              <strong className="text-white">ODDS_API_KEY</strong> = Bookmaker odds
              provider (separate). LIVE_PICK remains blocked until ODDS_API_KEY
              exists -- API_FOOTBALL_KEY alone does NOT activate live picks.
            </p>
          </div>
        </div>
      </div>

      {/* Sync controls */}
      <div className="card p-5 mb-6 border border-base-600/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-white">Sync Controls</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Fetch real data from API-Football. Each sync has a 120s cooldown.
            </p>
          </div>
          <div className="flex gap-2">
            <SyncButton type="teams" label="Sync Teams" icon={Users} />
            <SyncButton type="fixtures" label="Sync Fixtures" icon={Trophy} />
            <SyncButton
              type="standings"
              label="Sync Standings + Stats"
              icon={BarChart2}
            />
          </div>
        </div>

        {syncResult && (
          <div
            className="px-4 py-2.5 rounded-lg text-xs"
            style={{
              backgroundColor: syncResult.ok ? "#10B98110" : "#f8717110",
              border: `1px solid ${syncResult.ok ? "#10B98130" : "#f8717130"}`,
              color: syncResult.ok ? "#10B981" : "#f87171",
            }}
          >
            {syncResult.message}
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
        <div className="card p-3 text-center">
          <Trophy size={14} className="mx-auto mb-1 text-accent" />
          <p className="font-mono text-xl font-bold text-accent">
            {summary?.fixtures.total_synced ?? 0}
          </p>
          <p className="text-xs text-slate-600">Fixtures Synced</p>
        </div>
        <div className="card p-3 text-center">
          <Users size={14} className="mx-auto mb-1 text-good" />
          <p className="font-mono text-xl font-bold text-good">
            {summary?.teams.total_synced ?? 0}
          </p>
          <p className="text-xs text-slate-600">Teams Synced</p>
        </div>
        <div className="card p-3 text-center">
          <BarChart2 size={14} className="mx-auto mb-1" style={{ color: "#00D4FF" }} />
          <p className="font-mono text-xl font-bold" style={{ color: "#00D4FF" }}>
            {summary?.standings.total_synced ?? 0}
          </p>
          <p className="text-xs text-slate-600">Standings Synced</p>
        </div>
        <div className="card p-3 text-center">
          <AlertTriangle size={14} className="mx-auto mb-1 text-warn" />
          <p className="font-mono text-xl font-bold text-warn">
            {summary?.missing_data_count ?? 0}
          </p>
          <p className="text-xs text-slate-600">Missing Data</p>
        </div>
        <div className="card p-3 text-center">
          <Database size={14} className="mx-auto mb-1 text-slate-400" />
          <p className="font-mono text-xl font-bold text-white">
            {summary?.linked_teams ?? 0}
            <span className="text-slate-500 text-sm">
              /{summary?.total_teams ?? 0}
            </span>
          </p>
          <p className="text-xs text-slate-600">Teams Linked</p>
        </div>
        <div className="card p-3 text-center">
          <Database size={14} className="mx-auto mb-1 text-slate-400" />
          <p className="font-mono text-xl font-bold text-white">
            {summary?.linked_matches ?? 0}
            <span className="text-slate-500 text-sm">
              /{summary?.total_matches ?? 0}
            </span>
          </p>
          <p className="text-xs text-slate-600">Matches Linked</p>
        </div>
        <div className="card p-3 text-center">
          <XCircle size={14} className="mx-auto mb-1 text-bad" />
          <p className="font-mono text-xl font-bold text-bad">
            {(summary?.fixtures.total_errors ?? 0) +
              (summary?.teams.total_errors ?? 0) +
              (summary?.standings.total_errors ?? 0)}
          </p>
          <p className="text-xs text-slate-600">Total Errors</p>
        </div>
        <div className="card p-3 text-center">
          <Key size={14} className="mx-auto mb-1 text-slate-400" />
          <p className="font-mono text-xs font-bold text-slate-400 mt-1">
            API_FOOTBALL_KEY
          </p>
          <p className="text-xs text-slate-600 mt-0.5">Secret-only</p>
        </div>
      </div>

      {/* Sync status per type */}
      <h2 className="text-sm font-bold text-white mb-3">Sync Status by Type</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {(["fixtures", "teams", "standings"] as const).map((type) => {
          const s = summary?.[type];
          return (
            <div key={type} className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                {type === "fixtures" ? (
                  <Trophy size={14} className="text-accent" />
                ) : type === "teams" ? (
                  <Users size={14} className="text-good" />
                ) : (
                  <BarChart2 size={14} style={{ color: "#00D4FF" }} />
                )}
                <h3 className="text-sm font-bold text-white capitalize">
                  {type}
                </h3>
                <span
                  className="ml-auto text-xs font-bold"
                  style={{
                    color: statusColor(s?.last_status || "never"),
                  }}
                >
                  {(s?.last_status || "NEVER").toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="font-mono text-lg font-bold text-white">
                    {s?.total_synced ?? 0}
                  </p>
                  <p className="text-xs text-slate-600">Synced</p>
                </div>
                <div>
                  <p className="font-mono text-lg font-bold text-slate-400">
                    {s?.total_syncs ?? 0}
                  </p>
                  <p className="text-xs text-slate-600">Runs</p>
                </div>
                <div>
                  <p
                    className="font-mono text-lg font-bold"
                    style={{
                      color: (s?.total_errors ?? 0) > 0 ? "#f87171" : "#10B981",
                    }}
                  >
                    {s?.total_errors ?? 0}
                  </p>
                  <p className="text-xs text-slate-600">Errors</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Provider missing data */}
      <h2 className="text-sm font-bold text-white mb-3">
        Provider Missing Data ({allMissing.length})
      </h2>
      <div className="card overflow-x-auto mb-8">
        {allMissing.length === 0 ? (
          <div className="p-6 text-center">
            <CheckCircle size={20} className="text-good mx-auto mb-2" />
            <p className="text-sm text-slate-400">
              No missing data flags. All requested data is available from the
              provider.
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-base-700/60 bg-base-700/20">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Reference
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Reason
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-28">
                  Last Checked
                </th>
              </tr>
            </thead>
            <tbody>
              {allMissing.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-base-700/30 last:border-0"
                >
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-bold text-warn uppercase">
                      {m.entity_type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <code className="text-xs text-accent bg-base-700/60 px-1.5 py-0.5 rounded">
                      {m.entity_ref}
                    </code>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-slate-400">{m.reason}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-slate-400">
                      {timeSince(m.last_checked_at)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Sync history */}
      <h2 className="text-sm font-bold text-white mb-3">Sync History</h2>
      <div className="card overflow-x-auto mb-8">
        {allSyncLogs.length === 0 ? (
          <div className="p-6 text-center">
            <RefreshCw size={20} className="text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">
              No sync attempts yet. Use the buttons above to begin.
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-base-700/60 bg-base-700/20">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-24">
                  When
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-20">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-24">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-20">
                  Synced
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-20">
                  Skipped
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-16">
                  Errors
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {allSyncLogs.map((l) => (
                <tr
                  key={l.id}
                  className="border-b border-base-700/30 last:border-0"
                >
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-slate-400">
                      {timeSince(l.started_at)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-bold text-accent uppercase">
                      {l.sync_type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className="text-xs font-bold"
                      style={{ color: statusColor(l.status) }}
                    >
                      {(l.status || "").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-sm font-mono font-bold text-white">
                      {l.synced_count}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-sm font-mono text-slate-400">
                      {l.skipped_count}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className="text-sm font-mono font-bold"
                      style={{
                        color: l.error_count > 0 ? "#f87171" : "#10B981",
                      }}
                    >
                      {l.error_count}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-slate-500 truncate block max-w-[250px]">
                      {l.error_message || l.league_filter || "--"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Safety rules */}
      <h2 className="text-sm font-bold text-white mb-3">Safety Rules</h2>
      <div className="card p-5 border border-accent/30 bg-accent/5">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="text-accent shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-xs text-slate-300">
              <strong className="text-white">1. No fake teams or fixtures.</strong>{" "}
              All data comes from API-Football via API_FOOTBALL_KEY. If the key is
              missing, nothing is written.
            </p>
            <p className="text-xs text-slate-300">
              <strong className="text-white">2. No duplicate fixtures.</strong>{" "}
              Fixtures are matched by external_id. Existing matches are updated,
              not duplicated.
            </p>
            <p className="text-xs text-slate-300">
              <strong className="text-white">3. Teams link to leagues.</strong>{" "}
              Teams are assigned to their league via league_id. Aliases are
              auto-created from API-Football names.
            </p>
            <p className="text-xs text-slate-300">
              <strong className="text-white">
                4. Provider-missing data is flagged.
              </strong>{" "}
              When the API returns empty standings or stats, it is logged in
              provider_missing_data with the reason.
            </p>
            <p className="text-xs text-slate-300">
              <strong className="text-white">
                5. LIVE_PICK stays blocked.
              </strong>{" "}
              API_FOOTBALL_KEY provides fixtures and results only. ODDS_API_KEY is
              still required for live bookmaker odds. has_live_odds is never set by
              these sync functions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
