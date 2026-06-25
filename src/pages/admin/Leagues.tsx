import { useState } from "react";
import { CircleCheck as CheckCircle, Circle as XCircle, TriangleAlert as AlertTriangle } from "lucide-react";
import { useAdminLeagues } from "../../lib/adminHooks";
import { PageHeader, Spinner, ErrorState } from "../../components/ui";
import type { League } from "../../lib/adminHooks";

const TIER_COLORS: Record<number, string> = {
  1: "#10B981",
  2: "#00D4FF",
  3: "#fbbf24",
  4: "#f87171",
};

const PROVIDER_COLORS: Record<string, string> = {
  ok:      "#10B981",
  partial: "#fbbf24",
  missing: "#f87171",
  unknown: "#64748b",
};

const COMP_TYPES = ["all", "domestic_league", "continental", "international", "international_tournament", "womens", "youth"];
const COMP_LABELS: Record<string, string> = {
  all: "All",
  domestic_league: "Domestic",
  continental: "Continental",
  international: "International",
  international_tournament: "Tournament",
  womens: "Women's",
  youth: "Youth",
};

function CoverageBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-base-700 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-mono" style={{ color }}>{Math.round(value)}%</span>
    </div>
  );
}

function LeagueRow({ league, i }: { league: League; i: number }) {
  const tierColor = TIER_COLORS[league.tier] || "#64748b";
  const provColor = PROVIDER_COLORS[league.provider_flag] || "#64748b";
  return (
    <tr className="border-b border-base-700/30 last:border-0 hover:bg-base-700/20 transition-colors">
      <td className="px-4 py-3 text-xs text-slate-600 font-mono">{i + 1}</td>
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">{league.name}</p>
          <p className="text-xs text-slate-500">{league.country} · {league.season}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="badge text-xs font-bold" style={{ backgroundColor: `${tierColor}15`, color: tierColor, border: `1px solid ${tierColor}30` }}>
          {league.tier_label}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-slate-400 capitalize">
        {league.competition_type.replace(/_/g, " ")}
      </td>
      <td className="px-4 py-3">
        <CoverageBar value={league.fixture_coverage} color="#00D4FF" />
      </td>
      <td className="px-4 py-3">
        <CoverageBar value={league.odds_coverage} color="#10B981" />
      </td>
      <td className="px-4 py-3">
        <CoverageBar value={league.stats_coverage} color="#fbbf24" />
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-xs font-mono" style={{ color: provColor }}>{league.provider_flag}</span>
      </td>
      <td className="px-4 py-3 text-center">
        {league.playable ? (
          <CheckCircle size={16} className="text-good mx-auto" />
        ) : (
          <XCircle size={16} className="text-bad mx-auto" />
        )}
      </td>
    </tr>
  );
}

export default function AdminLeagues() {
  const [tier, setTier] = useState<number | undefined>(undefined);
  const [compType, setCompType] = useState("all");

  const { data, isLoading, isError } = useAdminLeagues({
    tier,
    competition_type: compType === "all" ? undefined : compType,
  });

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
      <PageHeader title="League Registry" subtitle={`${data?.length ?? 0} competitions`} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-1">
          {[undefined, 1, 2, 3, 4].map((t) => (
            <button
              key={String(t)}
              onClick={() => setTier(t)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${tier === t ? "bg-accent text-base-900" : "bg-base-700/50 text-slate-400 hover:text-white"}`}
            >
              {t === undefined ? "All Tiers" : `T${t}`}
            </button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          {COMP_TYPES.map((ct) => (
            <button
              key={ct}
              onClick={() => setCompType(ct)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${compType === ct ? "bg-accent text-base-900" : "bg-base-700/50 text-slate-400 hover:text-white"}`}
            >
              {COMP_LABELS[ct]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <Spinner /> : isError ? <ErrorState message="Failed to load leagues" /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-base-700 bg-base-700/20">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-8">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">League</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Tier</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Fixtures</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Odds</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Stats</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Provider</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Playable</th>
                </tr>
              </thead>
              <tbody>
                {(data || []).map((l, i) => <LeagueRow key={l.id} league={l} i={i} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
