import { useThinLeagues } from "../../lib/adminHooks";
import { PageHeader, Spinner, ErrorState } from "../../components/ui";
import { TriangleAlert as AlertTriangle, Circle as XCircle } from "lucide-react";
import type { League } from "../../lib/adminHooks";

const RISK_MAP: Record<string, { color: string; label: string }> = {
  missing: { color: "#f87171", label: "Critical" },
  partial:  { color: "#fbbf24", label: "Partial" },
  unknown:  { color: "#64748b", label: "Unknown" },
  ok:       { color: "#10B981", label: "OK" },
};

function RiskBadge({ flag }: { flag: string }) {
  const r = RISK_MAP[flag] || RISK_MAP.unknown;
  return (
    <span className="badge text-xs" style={{ backgroundColor: `${r.color}15`, color: r.color, border: `1px solid ${r.color}30` }}>
      {r.label}
    </span>
  );
}

function DataFlag({ has, label }: { has: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1">
      {has ? null : <XCircle size={11} className="text-bad" />}
      <span className={`text-xs ${has ? "text-slate-600 line-through" : "text-bad"}`}>{label}</span>
    </div>
  );
}

export default function ThinLeagues() {
  const { data, isLoading, isError } = useThinLeagues();

  if (isLoading) return <Spinner />;
  if (isError) return <ErrorState message="Failed to load thin leagues" />;

  const leagues = data || [];
  const critical = leagues.filter((l) => l.provider_flag === "missing");
  const partial = leagues.filter((l) => l.provider_flag === "partial");
  const unknown = leagues.filter((l) => l.provider_flag === "unknown");

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <PageHeader title="Thin Leagues" subtitle="Data-risk and coverage-deficient competitions" />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-5 border-bad/30">
          <p className="text-xs uppercase tracking-wider text-bad mb-2">Critical / Missing</p>
          <p className="font-mono text-3xl font-bold text-bad">{critical.length}</p>
          <p className="text-xs text-slate-500 mt-1">No provider data available</p>
        </div>
        <div className="card p-5 border-warn/30">
          <p className="text-xs uppercase tracking-wider text-warn mb-2">Partial Coverage</p>
          <p className="font-mono text-3xl font-bold text-warn">{partial.length}</p>
          <p className="text-xs text-slate-500 mt-1">Some data missing or unreliable</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Unknown / Needs Audit</p>
          <p className="font-mono text-3xl font-bold text-slate-400">{unknown.length}</p>
          <p className="text-xs text-slate-500 mt-1">Not yet audited</p>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-base-700 flex items-center gap-2">
          <AlertTriangle size={16} className="text-warn" />
          <span className="text-sm font-semibold text-white">All At-Risk Leagues ({leagues.length})</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-base-700 bg-base-700/20">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">League</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Tier</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Risk</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 w-24">Odds</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Missing</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Notes</th>
              </tr>
            </thead>
            <tbody>
              {leagues.map((l: League) => (
                <tr key={l.id} className="border-b border-base-700/30 last:border-0 hover:bg-base-700/20">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-white">{l.name}</p>
                    <p className="text-xs text-slate-500">{l.country} · {l.season}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-mono text-sm font-bold" style={{ color: l.tier === 3 ? "#fbbf24" : "#f87171" }}>T{l.tier}</span>
                  </td>
                  <td className="px-4 py-3 text-center"><RiskBadge flag={l.provider_flag} /></td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-mono text-sm ${l.odds_coverage < 40 ? "text-bad" : l.odds_coverage < 65 ? "text-warn" : "text-good"}`}>
                      {Math.round(l.odds_coverage)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      <DataFlag has={l.has_fixtures} label="fixtures" />
                      <DataFlag has={l.has_odds} label="odds" />
                      <DataFlag has={l.has_stats} label="stats" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px]">{l.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
