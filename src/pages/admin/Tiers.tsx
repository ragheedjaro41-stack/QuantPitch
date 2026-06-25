import { useAdminLeagues, useLeagueTierSummary, useSafetyRules } from "../../lib/adminHooks";
import { PageHeader, Spinner, ErrorState } from "../../components/ui";
import { CircleCheck as CheckCircle, Circle as XCircle, Shield, TriangleAlert as AlertTriangle } from "lucide-react";
import type { League } from "../../lib/adminHooks";

const TIER_META = [
  { tier: 1, label: "Tier 1", color: "#10B981", desc: "Major reliable leagues. Full coverage. Primary markets." },
  { tier: 2, label: "Tier 2", color: "#00D4FF", desc: "Good coverage leagues. Solid odds and stats. Minor gaps acceptable." },
  { tier: 3, label: "Tier 3", color: "#fbbf24", desc: "Playable but weaker data. Stats thin. Confidence capped." },
  { tier: 4, label: "Tier 4", color: "#f87171", desc: "Data-risk leagues. Manual audit required before enabling." },
];

function TierCard({ meta, leagues }: { meta: typeof TIER_META[0]; leagues: League[] }) {
  const playable = leagues.filter((l) => l.playable);
  const blocked = leagues.filter((l) => !l.playable);

  return (
    <div className="card p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl font-mono font-bold text-lg"
          style={{ backgroundColor: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}30` }}>
          T{meta.tier}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white">{meta.label}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{meta.desc}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4 pt-4 border-t border-base-700">
        <div className="text-center">
          <p className="font-mono text-xl font-bold text-white">{leagues.length}</p>
          <p className="text-xs text-slate-500">Total</p>
        </div>
        <div className="text-center">
          <p className="font-mono text-xl font-bold text-good">{playable.length}</p>
          <p className="text-xs text-slate-500">Playable</p>
        </div>
        <div className="text-center">
          <p className="font-mono text-xl font-bold text-bad">{blocked.length}</p>
          <p className="text-xs text-slate-500">Blocked</p>
        </div>
      </div>

      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {leagues.map((l) => (
          <div key={l.id} className="flex items-center gap-2 rounded-lg p-2 hover:bg-base-700/30 transition-colors">
            {l.playable ? (
              <CheckCircle size={12} className="text-good shrink-0" />
            ) : (
              <XCircle size={12} className="text-bad shrink-0" />
            )}
            <span className="text-xs text-slate-300 flex-1 truncate">{l.name}</span>
            <span className="text-xs text-slate-600 shrink-0">{l.country}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminTiers() {
  const { data: leagues, isLoading, isError } = useAdminLeagues();
  const { data: safetyRules, isLoading: srLoading } = useSafetyRules();

  if (isLoading || srLoading) return <Spinner />;
  if (isError) return <ErrorState message="Failed to load tiers" />;

  const allLeagues = leagues || [];

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
      <PageHeader title="Tier System" subtitle="League classification and thresholds" />

      {/* Tier cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {TIER_META.map((meta) => (
          <TierCard
            key={meta.tier}
            meta={meta}
            leagues={allLeagues.filter((l) => l.tier === meta.tier)}
          />
        ))}
      </div>

      {/* Special categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          { label: "Cup", color: "#a78bfa", filter: (l: League) => l.tier_label === "Cup" },
          { label: "International", color: "#f472b6", filter: (l: League) => l.tier_label === "International" },
          { label: "Women's", color: "#fb923c", filter: (l: League) => l.competition_type === "womens" },
        ].map((cat) => {
          const catLeagues = allLeagues.filter(cat.filter);
          return (
            <div key={cat.label} className="card p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-8 flex items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${cat.color}15`, border: `1px solid ${cat.color}30` }}>
                  <Shield size={16} style={{ color: cat.color }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{cat.label}</h3>
                  <p className="text-xs text-slate-500">{catLeagues.length} competitions</p>
                </div>
              </div>
              <div className="space-y-1">
                {catLeagues.map((l) => (
                  <div key={l.id} className="flex items-center gap-2">
                    {l.playable ? <CheckCircle size={11} className="text-good shrink-0" /> : <XCircle size={11} className="text-bad shrink-0" />}
                    <span className="text-xs text-slate-400 truncate">{l.name}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Safety rule thresholds table */}
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <AlertTriangle size={18} className="text-warn" /> Safety Rule Thresholds
      </h2>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-base-700 bg-base-700/20">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Rule</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Min Fixtures</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Min Odds</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Min Stats</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Min Settlement</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Consequence</th>
            </tr>
          </thead>
          <tbody>
            {(safetyRules || []).map((r) => (
              <tr key={r.id} className="border-b border-base-700/30 last:border-0 hover:bg-base-700/20">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-white">{r.rule_name.replace(/_/g, " ")}</p>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-xs truncate">{r.description}</p>
                </td>
                <td className="px-4 py-3 text-center font-mono text-sm text-slate-300">{r.min_fixtures}</td>
                <td className="px-4 py-3 text-center font-mono text-sm text-slate-300">{r.min_odds_coverage}%</td>
                <td className="px-4 py-3 text-center font-mono text-sm text-slate-300">{r.min_stats_coverage}%</td>
                <td className="px-4 py-3 text-center font-mono text-sm text-slate-300">{r.min_settlement_coverage}%</td>
                <td className="px-4 py-3 text-xs text-bad max-w-xs truncate">{r.consequence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
