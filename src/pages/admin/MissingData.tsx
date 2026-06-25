import { useMissingProviderData, usePredictionRules } from "../../lib/adminHooks";
import { PageHeader, Spinner, ErrorState } from "../../components/ui";
import { Circle as XCircle, TriangleAlert as AlertTriangle, Settings } from "lucide-react";
import type { DataCoverage } from "../../lib/adminHooks";

const RISK_COLORS: Record<string, string> = {
  critical: "#f87171",
  high:     "#f97316",
  medium:   "#fbbf24",
  low:      "#10B981",
  unknown:  "#64748b",
};

const FLAG_DESCRIPTIONS: Record<string, string> = {
  fixtures: "No fixture history — cannot train models",
  odds:     "No market odds — cannot validate predictions",
  stats:    "No player/team stats — model confidence limited",
  standings: "No standings — cannot assess form",
};

function MissingRow({ item }: { item: DataCoverage }) {
  const riskColor = RISK_COLORS[item.risk_level] || "#64748b";
  return (
    <tr className="border-b border-base-700/30 last:border-0 hover:bg-base-700/20">
      <td className="px-4 py-3">
        <p className="text-sm font-semibold text-white">{item.entity_name}</p>
        <p className="text-xs text-slate-500 capitalize">{item.entity_type}</p>
      </td>
      <td className="px-4 py-3">
        <span className="badge text-xs capitalize" style={{ backgroundColor: `${riskColor}15`, color: riskColor, border: `1px solid ${riskColor}30` }}>
          {item.risk_level}
        </span>
      </td>
      <td className="px-4 py-3 font-mono text-sm" style={{ color: item.overall_score < 40 ? "#f87171" : item.overall_score < 65 ? "#fbbf24" : "#10B981" }}>
        {Math.round(item.overall_score)}%
      </td>
      <td className="px-4 py-3">
        <div className="space-y-1">
          {item.missing_data_flags.map((flag) => (
            <div key={flag} className="flex items-start gap-2">
              <XCircle size={12} className="text-bad shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-bad capitalize">{flag}</p>
                <p className="text-xs text-slate-500">{FLAG_DESCRIPTIONS[flag] || "Missing data"}</p>
              </div>
            </div>
          ))}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="space-y-1">
          {Object.entries(item.provider_flags).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-16">{k}</span>
              <span className={`text-xs font-mono ${v === "ok" ? "text-good" : v === "missing" ? "text-bad" : "text-warn"}`}>{v}</span>
            </div>
          ))}
        </div>
      </td>
    </tr>
  );
}

export default function MissingData() {
  const { data: missing, isLoading, isError } = useMissingProviderData();
  const { data: rules } = usePredictionRules();

  const safetyRules = (rules || []).filter((r) => r.category === "safety");

  if (isLoading) return <Spinner />;
  if (isError) return <ErrorState message="Failed to load missing data report" />;

  const items = missing || [];
  const critical = items.filter((i) => i.risk_level === "critical");
  const high = items.filter((i) => i.risk_level === "high");

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
      <PageHeader title="Provider Missing Data" subtitle="Competitions with coverage gaps flagged for resolution" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Total Flagged</p>
          <p className="font-mono text-3xl font-bold text-white">{items.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider text-bad mb-2">Critical</p>
          <p className="font-mono text-3xl font-bold text-bad">{critical.length}</p>
          <p className="text-xs text-slate-500 mt-1">Require immediate action</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider text-warn mb-2">High Risk</p>
          <p className="font-mono text-3xl font-bold text-warn">{high.length}</p>
          <p className="text-xs text-slate-500 mt-1">Review before enabling</p>
        </div>
      </div>

      {/* Resolution mandate */}
      <div className="card p-5 mb-8 border-bad/30 bg-bad/5">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-bad shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-white mb-1">Resolution Is Mandatory (Law 3)</p>
            <p className="text-xs text-slate-400">
              No competition with critical or high risk flags may be marked as playable until all missing data flags are resolved.
              Each flagged item below requires a provider ticket or manual audit before enabling predictions.
            </p>
          </div>
        </div>
      </div>

      {/* Main table */}
      <div className="card overflow-x-auto mb-8">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-base-700 bg-base-700/20">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Entity</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Risk</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Score</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Missing Data</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Provider Flags</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => <MissingRow key={item.id} item={item} />)}
          </tbody>
        </table>
      </div>

      {/* Active safety model rules */}
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Settings size={18} className="text-accent" /> Active Safety Model Rules
      </h2>
      <div className="space-y-2">
        {safetyRules.map((r) => (
          <div key={r.id} className="card p-4 flex items-start gap-3">
            <div className={`mt-0.5 h-5 w-5 flex items-center justify-center rounded-full shrink-0 ${r.weight_modifier === 0 ? "bg-bad/20" : "bg-warn/20"}`}>
              <XCircle size={12} className={r.weight_modifier === 0 ? "text-bad" : "text-warn"} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{r.rule_name.replace(/_/g, " ")}</p>
              <p className="text-xs text-slate-500 mt-0.5">{r.rule_description}</p>
            </div>
            <span className={`badge text-xs ${r.active ? "bg-good/10 text-good" : "bg-bad/10 text-bad"}`}>
              {r.active ? "Active" : "Disabled"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
