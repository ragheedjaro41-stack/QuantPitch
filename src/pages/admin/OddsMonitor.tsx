import { useOddsProviders, useOddsMonitor, useCoverageRefreshLog } from "../../lib/adminHooks";
import { PageHeader, Spinner } from "../../components/ui";
import { ODDS_STALE_THRESHOLD_HOURS } from "../../lib/oddsProvider";
import { Radio, CircleX as XCircle, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Clock, Database, ChartBar as BarChart2, Wifi, WifiOff, RefreshCw, ShieldAlert } from "lucide-react";

function timeSince(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function OddsMonitor() {
  const { data: providers, isLoading: pLoading } = useOddsProviders();
  const { data: monitor, isLoading: mLoading } = useOddsMonitor();
  const { data: refreshLog } = useCoverageRefreshLog(5);

  const isLoading = pLoading || mLoading;
  if (isLoading) return <Spinner />;

  const allProviders = providers || [];
  const activeProviders = allProviders.filter((p) => p.status === "active");
  const hasAnyCredentials = allProviders.some((p) => p.api_endpoint !== null);

  const leagues = monitor?.leagues || [];
  const withFreshOdds = leagues.filter((l) => l.fresh_odds_count > 0);
  const withStaleOnly = leagues.filter((l) => l.total_odds_count > 0 && l.fresh_odds_count === 0);
  const withNoOdds = leagues.filter((l) => l.total_odds_count === 0 && !l.is_synthetic);
  const syntheticLeagues = leagues.filter((l) => l.is_synthetic);
  const liveReadyLeagues = leagues.filter((l) => l.has_live_odds && l.playable && !l.is_synthetic);

  const lastRefresh = refreshLog?.[0];

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <PageHeader
        title="Odds Monitor"
        subtitle="Live connection audit -- provider health, sync status, league freshness"
      />

      {/* Connection verdict */}
      <div className="card p-6 mb-6 border-l-4" style={{ borderColor: activeProviders.length > 0 ? "#10B981" : "#f87171" }}>
        <div className="flex items-start gap-4">
          {activeProviders.length > 0 ? (
            <Wifi size={20} className="text-good shrink-0 mt-0.5" />
          ) : (
            <WifiOff size={20} className="text-bad shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <h3 className="text-sm font-bold text-white">
              {activeProviders.length > 0
                ? `${activeProviders.length} provider(s) active`
                : "No odds providers connected"}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {hasAnyCredentials
                ? "API endpoints configured but providers may not be active."
                : "No API endpoints configured on any provider. All leagues will remain MISSING ODDS / BLOCKED_PICK until a real odds feed is connected."}
            </p>
            <div className="flex gap-6 mt-3">
              <div>
                <p className="font-mono text-xl font-bold text-bad">{activeProviders.length === 0 ? "NO" : "YES"}</p>
                <p className="text-xs text-slate-600">Real odds connected</p>
              </div>
              <div>
                <p className="font-mono text-xl font-bold text-bad">{liveReadyLeagues.length === 0 ? "NO" : "YES"}</p>
                <p className="text-xs text-slate-600">Live picks available</p>
              </div>
              <div>
                <p className="font-mono text-xl font-bold text-accent">{liveReadyLeagues.length}</p>
                <p className="text-xs text-slate-600">LIVE READY leagues</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Providers grid */}
      <h2 className="text-sm font-bold text-white mb-3">Provider Health</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {allProviders.map((p) => {
          const statusColor =
            p.status === "active" ? "#10B981" :
            p.status === "error" ? "#f87171" :
            p.status === "stale" ? "#fbbf24" : "#64748b";
          return (
            <div key={p.id} className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Radio size={12} style={{ color: statusColor }} />
                <p className="text-sm font-semibold text-white truncate">{p.name}</p>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Status</span>
                  <span className="text-xs font-bold" style={{ color: statusColor }}>{p.status.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">API Endpoint</span>
                  <span className="text-xs text-slate-400 truncate max-w-[120px]">{p.api_endpoint || "Not set"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Last Success</span>
                  <span className="text-xs text-slate-400">{p.last_success_at ? timeSince(p.last_success_at) : "Never"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Last Ping</span>
                  <span className="text-xs text-slate-400">{p.last_ping_at ? timeSince(p.last_ping_at) : "Never"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sync summary */}
      <h2 className="text-sm font-bold text-white mb-3">Odds Sync Summary</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <div className="card p-3 text-center">
          <Database size={14} className="mx-auto mb-1 text-accent" />
          <p className="font-mono text-xl font-bold text-accent">{monitor?.totalOdds ?? 0}</p>
          <p className="text-xs text-slate-600">Total Odds Rows</p>
        </div>
        <div className="card p-3 text-center">
          <CheckCircle size={14} className="mx-auto mb-1 text-good" />
          <p className="font-mono text-xl font-bold text-good">{monitor?.totalFresh ?? 0}</p>
          <p className="text-xs text-slate-600">Fresh</p>
        </div>
        <div className="card p-3 text-center">
          <Clock size={14} className="mx-auto mb-1 text-warn" />
          <p className="font-mono text-xl font-bold text-warn">{monitor?.totalStale ?? 0}</p>
          <p className="text-xs text-slate-600">Stale</p>
        </div>
        <div className="card p-3 text-center">
          <BarChart2 size={14} className="mx-auto mb-1 text-slate-400" />
          <p className="font-mono text-xl font-bold text-white">{monitor?.uniqueBookmakers.length ?? 0}</p>
          <p className="text-xs text-slate-600">Bookmakers</p>
        </div>
        <div className="card p-3 text-center">
          <ShieldAlert size={14} className="mx-auto mb-1 text-slate-400" />
          <p className="font-mono text-xl font-bold text-white">{monitor?.uniqueMarkets.length ?? 0}</p>
          <p className="text-xs text-slate-600">Markets</p>
        </div>
        <div className="card p-3 text-center">
          <Clock size={14} className="mx-auto mb-1 text-slate-400" />
          <p className="font-mono text-xl font-bold text-white">{ODDS_STALE_THRESHOLD_HOURS}h</p>
          <p className="text-xs text-slate-600">Stale Threshold</p>
        </div>
      </div>

      {/* Last coverage refresh */}
      {lastRefresh && (
        <div className="card p-4 mb-6 flex items-center gap-3">
          <RefreshCw size={14} className={lastRefresh.status === "completed" ? "text-good" : "text-bad"} />
          <div>
            <p className="text-xs font-semibold text-white">
              Last coverage refresh: {new Date(lastRefresh.started_at).toLocaleString()}
            </p>
            <p className="text-xs text-slate-500">
              {lastRefresh.leagues_refreshed ?? 0} leagues -- {lastRefresh.status} -- triggered by {lastRefresh.triggered_by}
            </p>
          </div>
        </div>
      )}

      {/* Zero odds warning */}
      {(monitor?.totalOdds ?? 0) === 0 && (
        <div className="card p-5 mb-6 border border-bad/30 bg-bad/5">
          <div className="flex items-start gap-3">
            <XCircle size={16} className="text-bad shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-bad">Zero odds rows in database</p>
              <p className="text-xs text-slate-400 mt-1">
                No odds have ever been ingested. To populate odds: configure an API endpoint on a provider,
                deploy an edge function that calls <code className="text-xs bg-base-700/60 px-1 rounded">ingestMatchOdds()</code>,
                then call <code className="text-xs bg-base-700/60 px-1 rounded">syncLeagueLiveOddsFlags()</code> to
                update <code className="text-xs bg-base-700/60 px-1 rounded">has_live_odds</code> on each league.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* League odds matrix */}
      <h2 className="text-sm font-bold text-white mb-3">League Odds Status</h2>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <div className="card p-3 text-center">
          <p className="font-mono text-lg font-bold text-good">{withFreshOdds.length}</p>
          <p className="text-xs text-slate-600">Fresh Odds</p>
        </div>
        <div className="card p-3 text-center">
          <p className="font-mono text-lg font-bold text-warn">{withStaleOnly.length}</p>
          <p className="text-xs text-slate-600">Stale Only</p>
        </div>
        <div className="card p-3 text-center">
          <p className="font-mono text-lg font-bold text-bad">{withNoOdds.length}</p>
          <p className="text-xs text-slate-600">No Odds</p>
        </div>
        <div className="card p-3 text-center">
          <p className="font-mono text-lg font-bold text-slate-400">{syntheticLeagues.length}</p>
          <p className="text-xs text-slate-600">Synthetic/Demo</p>
        </div>
        <div className="card p-3 text-center">
          <p className="font-mono text-lg font-bold" style={{ color: liveReadyLeagues.length > 0 ? "#10B981" : "#f87171" }}>
            {liveReadyLeagues.length}
          </p>
          <p className="text-xs text-slate-600">LIVE READY</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-base-700/60 bg-base-700/20">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">League</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-16">Tier</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-24">has_live_odds</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-20">Fresh</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-20">Stale</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-28">Freshest</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-28">Bookmakers</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-28">Markets</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-36">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {leagues.map((l) => {
              let verdict: string;
              let verdictColor: string;
              if (l.is_synthetic) {
                verdict = "DEMO ONLY";
                verdictColor = "#fbbf24";
              } else if (l.has_live_odds && l.playable) {
                verdict = "LIVE READY";
                verdictColor = "#10B981";
              } else if (l.fresh_odds_count > 0 && !l.has_live_odds) {
                verdict = "SYNC NEEDED";
                verdictColor = "#00D4FF";
              } else if (l.stale_odds_count > 0 && l.fresh_odds_count === 0) {
                verdict = "STALE";
                verdictColor = "#fbbf24";
              } else if (!l.playable) {
                verdict = "BLOCKED";
                verdictColor = "#64748b";
              } else {
                verdict = "MISSING ODDS";
                verdictColor = "#f87171";
              }

              return (
                <tr key={l.id} className="border-b border-base-700/30 last:border-0 hover:bg-base-700/10 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className="text-sm text-white">{l.name}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-slate-500 font-mono">T{l.tier}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    {l.has_live_odds ? (
                      <CheckCircle size={14} className="text-good" />
                    ) : (
                      <XCircle size={14} className="text-bad" />
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-mono font-bold ${l.fresh_odds_count > 0 ? "text-good" : "text-slate-600"}`}>
                      {l.fresh_odds_count}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-mono font-bold ${l.stale_odds_count > 0 ? "text-warn" : "text-slate-600"}`}>
                      {l.stale_odds_count}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-slate-400">
                      {l.freshest_at ? timeSince(l.freshest_at) : "--"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-slate-400">
                      {l.bookmakers.length > 0 ? l.bookmakers.join(", ") : "--"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-slate-400">
                      {l.markets.length > 0 ? l.markets.join(", ") : "--"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-bold"
                      style={{ color: verdictColor, borderColor: `${verdictColor}33`, backgroundColor: `${verdictColor}10` }}
                    >
                      {verdict}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Blocked leagues detail */}
      <h2 className="text-sm font-bold text-white mt-8 mb-3">Why Each League Is Blocked</h2>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-base-700/60 bg-base-700/20">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">League</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-16">Tier</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Block Reason</th>
            </tr>
          </thead>
          <tbody>
            {leagues
              .filter((l) => !l.has_live_odds || !l.playable || l.is_synthetic)
              .map((l) => {
                const reasons: string[] = [];
                if (l.is_synthetic) reasons.push("Synthetic/demo league");
                if (!l.playable && !l.is_synthetic) reasons.push("playable=false in registry");
                if (!l.has_live_odds && !l.is_synthetic) reasons.push("has_live_odds=false -- no fresh odds from any provider");
                if (l.total_odds_count === 0 && !l.is_synthetic) reasons.push("Zero odds rows in match_odds table");
                return (
                  <tr key={l.id} className="border-b border-base-700/30 last:border-0">
                    <td className="px-4 py-2.5">
                      <span className="text-sm text-white">{l.name}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-slate-500 font-mono">T{l.tier}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-slate-400">{reasons.join(" | ")}</span>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
