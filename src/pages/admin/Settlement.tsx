import {
  useMatchResults,
  useSettlementLog,
  usePendingSettlementMatches,
  useSettlementSummary,
  useTrustedMarkets,
} from "../../lib/adminHooks";
import { PageHeader, Spinner } from "../../components/ui";
import {
  CircleCheck as CheckCircle,
  CircleX as XCircle,
  CircleAlert as AlertCircle,
  Clock,
  Database,
  ShieldCheck,
  FileWarning,
  List,
  Trophy,
} from "lucide-react";

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
      return "#10B981";
    case "void":
    case "postponed":
    case "cancelled":
    case "abandoned":
      return "#fbbf24";
    case "pending_review":
      return "#f97316";
    case "error":
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

export default function Settlement() {
  const { data: summary, isLoading: sL } = useSettlementSummary();
  const { data: results, isLoading: rL } = useMatchResults(30);
  const { data: logs } = useSettlementLog(50);
  const { data: pendingData, isLoading: pL } = usePendingSettlementMatches();
  const { data: trustedMarkets } = useTrustedMarkets();

  if (sL || rL || pL) return <Spinner />;

  const pending = pendingData?.pending || [];
  const totalSettled = pendingData?.totalSettled ?? 0;
  const allResults = results || [];
  const allLogs = logs || [];
  const markets = trustedMarkets || [];

  const confirmedResults = allResults.filter((r) => r.match_status === "confirmed");
  const voidResults = allResults.filter((r) =>
    ["postponed", "cancelled", "abandoned", "void"].includes(r.match_status)
  );
  const reviewResults = allResults.filter((r) => r.match_status === "pending_review");

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <PageHeader
        title="Settlement"
        subtitle="Results verification, market settlement, and audit log"
      />

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

      {/* Pending matches (no result yet) */}
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
                    <span className="text-xs text-slate-400">{r.provider_source || "--"}</span>
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
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-20">Trusted</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-24">Settlement</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Rule</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-24">Cup Handling</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-base-700/30">
              <td className="px-4 py-2.5">
                <code className="text-xs text-accent bg-base-700/60 px-1.5 py-0.5 rounded">h2h</code>
                <span className="text-sm text-white ml-2">Match Result (1X2)</span>
              </td>
              <td className="px-4 py-2.5"><CheckCircle size={14} className="text-good" /></td>
              <td className="px-4 py-2.5"><CheckCircle size={14} className="text-good" /></td>
              <td className="px-4 py-2.5"><span className="text-xs text-slate-400">FT regulation: home &gt; away = HOME, away &gt; home = AWAY, equal = DRAW</span></td>
              <td className="px-4 py-2.5"><span className="text-xs text-slate-400">90min only</span></td>
            </tr>
            <tr className="border-b border-base-700/30">
              <td className="px-4 py-2.5">
                <code className="text-xs text-accent bg-base-700/60 px-1.5 py-0.5 rounded">totals_1.5</code>
                <span className="text-sm text-white ml-2">Over/Under 1.5</span>
              </td>
              <td className="px-4 py-2.5"><CheckCircle size={14} className="text-good" /></td>
              <td className="px-4 py-2.5"><CheckCircle size={14} className="text-good" /></td>
              <td className="px-4 py-2.5"><span className="text-xs text-slate-400">FT total &gt; 1.5 = OVER, &lt; 1.5 = UNDER</span></td>
              <td className="px-4 py-2.5"><span className="text-xs text-slate-400">90min only</span></td>
            </tr>
            <tr className="border-b border-base-700/30">
              <td className="px-4 py-2.5">
                <code className="text-xs text-accent bg-base-700/60 px-1.5 py-0.5 rounded">totals_2.5</code>
                <span className="text-sm text-white ml-2">Over/Under 2.5</span>
              </td>
              <td className="px-4 py-2.5"><CheckCircle size={14} className="text-good" /></td>
              <td className="px-4 py-2.5"><CheckCircle size={14} className="text-good" /></td>
              <td className="px-4 py-2.5"><span className="text-xs text-slate-400">FT total &gt; 2.5 = OVER, &lt; 2.5 = UNDER</span></td>
              <td className="px-4 py-2.5"><span className="text-xs text-slate-400">90min only</span></td>
            </tr>
            <tr className="border-b border-base-700/30">
              <td className="px-4 py-2.5">
                <code className="text-xs text-accent bg-base-700/60 px-1.5 py-0.5 rounded">totals_3.5</code>
                <span className="text-sm text-white ml-2">Over/Under 3.5</span>
              </td>
              <td className="px-4 py-2.5"><CheckCircle size={14} className="text-good" /></td>
              <td className="px-4 py-2.5"><CheckCircle size={14} className="text-good" /></td>
              <td className="px-4 py-2.5"><span className="text-xs text-slate-400">FT total &gt; 3.5 = OVER, &lt; 3.5 = UNDER</span></td>
              <td className="px-4 py-2.5"><span className="text-xs text-slate-400">90min only</span></td>
            </tr>
            <tr className="border-b border-base-700/30 last:border-0">
              <td className="px-4 py-2.5">
                <code className="text-xs text-accent bg-base-700/60 px-1.5 py-0.5 rounded">btts</code>
                <span className="text-sm text-white ml-2">Both Teams to Score</span>
              </td>
              <td className="px-4 py-2.5"><CheckCircle size={14} className="text-good" /></td>
              <td className="px-4 py-2.5"><CheckCircle size={14} className="text-good" /></td>
              <td className="px-4 py-2.5"><span className="text-xs text-slate-400">Both FT scores &gt; 0 = YES, otherwise = NO</span></td>
              <td className="px-4 py-2.5"><span className="text-xs text-slate-400">90min only</span></td>
            </tr>
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
            <p className="text-sm text-slate-400">No settlement entries yet. Results must be ingested first.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-base-700/60 bg-base-700/20">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-28">Settled</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-20">Market</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-20">Outcome</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-24">Status</th>
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
              h2h, totals, and BTTS all settle from ft_home/ft_away (90 min). Extra time and penalties are recorded separately and never affect standard market outcomes.
            </p>
            <p className="text-xs text-slate-300">
              <strong className="text-white">4. No fake results.</strong>{" "}
              Results must come from a confirmed provider source. The settlement engine never generates or invents scores.
            </p>
            <p className="text-xs text-slate-300">
              <strong className="text-white">5. Unknown markets are rejected.</strong>{" "}
              Only h2h, totals_1.5, totals_2.5, totals_3.5, and btts are supported. Any other market key produces an error status.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
