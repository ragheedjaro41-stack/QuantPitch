import { Link } from "react-router-dom";
import { Shield, Trophy, ChartBar as BarChart2, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Circle as XCircle, Database, Settings, Globe, Users } from "lucide-react";
import { useAdminLeagues, useCoverageSummary, useLeagueTierSummary } from "../../lib/adminHooks";
import { PageHeader, Spinner, ErrorState, StatCard } from "../../components/ui";
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from "recharts";

const adminSections = [
  { to: "/admin/leagues",             label: "Leagues",            icon: Globe,         desc: "League registry, tiers, and coverage" },
  { to: "/admin/teams",               label: "Teams",              icon: Shield,        desc: "Team registry, aliases, country mapping" },
  { to: "/admin/cups",                label: "Cups",               icon: Trophy,        desc: "Cup competitions and rounds" },
  { to: "/admin/tiers",               label: "Tiers",              icon: BarChart2,     desc: "Tier system overview and thresholds" },
  { to: "/admin/coverage",            label: "Data Coverage",      icon: Database,      desc: "Fixture, odds, stats coverage audit" },
  { to: "/admin/thin-leagues",        label: "Thin Leagues",       icon: AlertTriangle, desc: "Data-risk and thin coverage leagues" },
  { to: "/admin/missing-data",        label: "Provider Gaps",      icon: XCircle,       desc: "Missing provider data by entity" },
  { to: "/admin/promotion-relegation",label: "Promotion/Relegation",icon: Users,        desc: "Promoted and relegated teams tracker" },
  { to: "/admin/cup-fixtures",        label: "Cup Fixtures",       icon: Settings,      desc: "Cup and knockout fixture browser" },
];

export default function AdminDashboard() {
  const leagues = useAdminLeagues();
  const coverage = useCoverageSummary();
  const tiers = useLeagueTierSummary();

  const isLoading = leagues.isLoading || coverage.isLoading || tiers.isLoading;
  if (isLoading) return <Spinner />;
  if (coverage.isError) return <ErrorState message="Failed to load admin data" />;

  const cv = coverage.data!;
  const allLeagues = leagues.data || [];
  const playable = allLeagues.filter((l) => l.playable).length;
  const blocked = allLeagues.filter((l) => !l.playable).length;

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <PageHeader
        title="Admin Dashboard"
        subtitle="QuantPitch soccer coverage registry"
      >
        <span className="badge bg-amber-500/10 text-amber-400 border border-amber-500/30">Admin</span>
      </PageHeader>

      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Leagues" value={allLeagues.length} icon={<Globe size={18} />} accent="#00D4FF" />
        <StatCard label="Playable" value={playable} icon={<CheckCircle size={18} />} accent="#10B981" />
        <StatCard label="Blocked" value={blocked} icon={<XCircle size={18} />} accent="#f87171" />
        <StatCard label="Avg Coverage" value={`${cv.avgScore}%`} icon={<Database size={18} />} accent="#fbbf24" />
      </div>

      {/* Tier breakdown + Risk breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Tier overview */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Leagues by Tier</h2>
          <div className="space-y-3">
            {(tiers.data || []).map((t) => (
              <div key={t.tier} className="flex items-center gap-4">
                <div className="w-16 shrink-0">
                  <span className="badge" style={{ backgroundColor: `${t.color}15`, color: t.color, border: `1px solid ${t.color}30` }}>
                    {t.label}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">{t.count} leagues · {t.playable} playable</span>
                    <span className="text-xs font-mono text-slate-500">Odds {t.avgOdds}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-base-700 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(t.playable / Math.max(t.count, 1)) * 100}%`, backgroundColor: t.color }}
                    />
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-500 w-12 text-right">{t.blocked} blocked</span>
              </div>
            ))}
          </div>
        </div>

        {/* Data risk levels */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Data Risk Distribution</h2>
          <div className="space-y-3">
            {[
              { key: "low",      label: "Low Risk",      color: "#10B981", count: cv.low },
              { key: "medium",   label: "Medium Risk",   color: "#fbbf24", count: cv.medium },
              { key: "high",     label: "High Risk",     color: "#f97316", count: cv.high },
              { key: "critical", label: "Critical",      color: "#f87171", count: cv.critical },
            ].map((r) => (
              <div key={r.key} className="flex items-center gap-4">
                <span className="w-24 text-xs font-medium shrink-0" style={{ color: r.color }}>{r.label}</span>
                <div className="flex-1 h-2 rounded-full bg-base-700 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(r.count / Math.max(cv.total, 1)) * 100}%`, backgroundColor: r.color }}
                  />
                </div>
                <span className="text-xs font-mono text-slate-400 w-6 text-right">{r.count}</span>
              </div>
            ))}
            <div className="pt-3 border-t border-base-700 grid grid-cols-3 gap-3 mt-2">
              <div className="text-center">
                <p className="text-xs text-slate-500">Missing Odds</p>
                <p className="font-mono text-lg font-bold text-bad">{cv.missingOdds}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Missing Stats</p>
                <p className="font-mono text-lg font-bold text-warn">{cv.missingStats}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Missing Fixtures</p>
                <p className="font-mono text-lg font-bold text-bad">{cv.missingFixtures}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin section grid */}
      <h2 className="text-lg font-semibold text-white mb-4">Admin Sections</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {adminSections.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="card card-hover p-5 group flex items-start gap-4"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 border border-accent/20 shrink-0">
              <s.icon size={18} className="text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white group-hover:text-accent transition-colors">{s.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
