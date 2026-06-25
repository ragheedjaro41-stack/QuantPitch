import { useAdminLeagues } from "../../lib/adminHooks";
import { PageHeader, Spinner, ErrorState, TeamBadge } from "../../components/ui";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { useTeamStats } from "../../lib/hooks";

export default function PromotionRelegation() {
  const { data: leagues, isLoading: lLoading } = useAdminLeagues({ competition_type: "domestic_league" });
  const { data: teamStats, isLoading: tLoading } = useTeamStats(null);

  const isLoading = lLoading || tLoading;
  if (isLoading) return <Spinner />;

  const tier1 = (leagues || []).filter((l) => l.tier === 1);
  const tier2 = (leagues || []).filter((l) => l.tier === 2);

  const teams = teamStats || [];
  const bottom3 = teams.slice(-3);
  const top3 = teams.slice(0, 3);

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <PageHeader title="Promotion / Relegation" subtitle="Current season promotion and relegation tracking" />

      {/* Example from the app's internal league */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card p-6">
          <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
            <ArrowUp size={16} className="text-good" /> Promotion Zone
          </h2>
          <p className="text-xs text-slate-500 mb-4">Top 3 teams — automatic promotion / playoff eligibility</p>
          <div className="space-y-2">
            {top3.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3 rounded-xl p-3 bg-good/5 border border-good/20">
                <span className="font-mono text-sm font-bold text-good w-5">{i + 1}</span>
                <TeamBadge short_name={t.short_name} color={t.primary_color} size="sm" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.points} pts · GD {t.goal_diff > 0 ? "+" : ""}{t.goal_diff}</p>
                </div>
                <ArrowUp size={16} className="text-good" />
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
            <ArrowDown size={16} className="text-bad" /> Relegation Zone
          </h2>
          <p className="text-xs text-slate-500 mb-4">Bottom 3 teams — relegation threatened</p>
          <div className="space-y-2">
            {bottom3.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3 rounded-xl p-3 bg-bad/5 border border-bad/20">
                <span className="font-mono text-sm font-bold text-bad w-5">{teams.length - bottom3.length + i + 1}</span>
                <TeamBadge short_name={t.short_name} color={t.primary_color} size="sm" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.points} pts · GD {t.goal_diff > 0 ? "+" : ""}{t.goal_diff}</p>
                </div>
                <ArrowDown size={16} className="text-bad" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* League tier mapping for P/R awareness */}
      <h2 className="text-lg font-semibold text-white mb-4">P/R Tier Mapping</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <span className="h-5 w-5 flex items-center justify-center rounded bg-good/20 text-good text-xs font-bold">1</span>
            Tier 1 Leagues ({tier1.length})
          </h3>
          <div className="space-y-1">
            {tier1.map((l) => (
              <div key={l.id} className="flex items-center gap-2">
                <Minus size={10} className="text-slate-600 shrink-0" />
                <span className="text-xs text-slate-400">{l.name}</span>
                <span className="ml-auto text-xs text-slate-600">{l.country}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <span className="h-5 w-5 flex items-center justify-center rounded bg-accent/20 text-accent text-xs font-bold">2</span>
            Tier 2 Leagues ({tier2.length}) — receive promoted
          </h3>
          <div className="space-y-1">
            {tier2.map((l) => (
              <div key={l.id} className="flex items-center gap-2">
                <Minus size={10} className="text-slate-600 shrink-0" />
                <span className="text-xs text-slate-400">{l.name}</span>
                <span className="ml-auto text-xs text-slate-600">{l.country}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* P/R prediction impact card */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-white mb-3">Prediction Impact Notes</h2>
        <div className="space-y-3">
          {[
            { icon: ArrowUp, color: "#10B981", title: "Promoted Teams", desc: "Teams promoted from Tier 2 have limited Tier 1 history. Confidence cap 70% for first 5 games. Use Tier 2 form as proxy." },
            { icon: ArrowDown, color: "#f87171", title: "Relegated Teams", desc: "Relegated teams may over-perform in Tier 2 initially. Apply +0.1 xG adjustment for first season." },
            { icon: Minus, color: "#fbbf24", title: "Mid-table Teams", desc: "Standard prediction rules apply. No adjustment for non-threatened mid-table positions." },
          ].map((note) => (
            <div key={note.title} className="flex items-start gap-3 rounded-xl p-3 bg-base-700/30">
              <note.icon size={16} style={{ color: note.color }} className="shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white">{note.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{note.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
