import { useState } from "react";
import { useDataCoverage, useCoverageSummary } from "../../lib/adminHooks";
import { PageHeader, Spinner, ErrorState, StatCard } from "../../components/ui";
import { Database, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Circle as XCircle } from "lucide-react";
import type { DataCoverage } from "../../lib/adminHooks";

const RISK_COLORS: Record<string, string> = {
  low:      "#10B981",
  medium:   "#fbbf24",
  high:     "#f97316",
  critical: "#f87171",
  unknown:  "#64748b",
};

function ScoreBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct >= 80 ? "#10B981" : pct >= 55 ? "#fbbf24" : "#f87171";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-base-700 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-mono" style={{ color }}>{Math.round(value)}%</span>
    </div>
  );
}

function CoverageRow({ item }: { item: DataCoverage }) {
  const riskColor = RISK_COLORS[item.risk_level] || "#64748b";
  return (
    <tr className="border-b border-base-700/30 last:border-0 hover:bg-base-700/20 transition-colors">
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white truncate max-w-[220px]">{item.entity_name}</p>
          <p className="text-xs text-slate-500 capitalize">{item.entity_type} · {item.historical_depth_years}y history</p>
        </div>
      </td>
      <td className="px-4 py-3"><ScoreBar value={item.fixture_coverage} /></td>
      <td className="px-4 py-3"><ScoreBar value={item.odds_coverage} /></td>
      <td className="px-4 py-3"><ScoreBar value={item.stats_coverage} /></td>
      <td className="px-4 py-3">
        <span className="font-mono text-base font-bold" style={{ color: RISK_COLORS[item.risk_level === "low" ? "low" : item.overall_score >= 60 ? "medium" : "critical"] }}>
          {Math.round(item.overall_score)}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="badge text-xs capitalize" style={{ backgroundColor: `${riskColor}15`, color: riskColor, border: `1px solid ${riskColor}30` }}>
          {item.risk_level}
        </span>
      </td>
      <td className="px-4 py-3">
        {item.missing_data_flags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {item.missing_data_flags.map((f) => (
              <span key={f} className="badge bg-bad/10 text-bad text-xs">{f}</span>
            ))}
          </div>
        ) : (
          <CheckCircle size={14} className="text-good" />
        )}
      </td>
    </tr>
  );
}

export default function AdminCoverage() {
  const [entityType, setEntityType] = useState<string | undefined>(undefined);
  const { data, isLoading, isError } = useDataCoverage(entityType);
  const { data: summary } = useCoverageSummary();

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
      <PageHeader title="Data Coverage Audit" subtitle="Fixture, odds, and stats coverage by competition" />

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Avg Coverage" value={`${summary.avgScore}%`} icon={<Database size={18} />} accent="#00D4FF" />
          <StatCard label="Low Risk" value={summary.low} icon={<CheckCircle size={18} />} accent="#10B981" />
          <StatCard label="Critical" value={summary.critical} icon={<XCircle size={18} />} accent="#f87171" />
          <StatCard label="Missing Odds" value={summary.missingOdds} icon={<AlertTriangle size={18} />} accent="#fbbf24" />
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {[undefined, "league", "cup"].map((t) => (
          <button
            key={String(t)}
            onClick={() => setEntityType(t)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${entityType === t ? "bg-accent text-base-900" : "bg-base-700/50 text-slate-400 hover:text-white"}`}
          >
            {t === undefined ? "All" : t.charAt(0).toUpperCase() + t.slice(1) + "s"}
          </button>
        ))}
      </div>

      {isLoading ? <Spinner /> : isError ? <ErrorState message="Failed to load coverage data" /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-base-700 bg-base-700/20">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Entity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Fixtures</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Odds</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Stats</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Score</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Risk</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Missing</th>
                </tr>
              </thead>
              <tbody>
                {(data || []).map((item) => <CoverageRow key={item.id} item={item} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
