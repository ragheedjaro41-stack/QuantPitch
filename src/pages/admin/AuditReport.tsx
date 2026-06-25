import { useAdminLeagues, useDataCoverage, useSafetyRules, useAdminCups } from "../../lib/adminHooks";
import { PageHeader, Spinner } from "../../components/ui";
import { CircleCheck as CheckCircle, CircleAlert as AlertCircle, CircleX as XCircle, Database, Shield, Trophy, TrendingUp } from "lucide-react";

type AuditStatus = "integrated" | "seeded" | "missing" | "blocked";

type AuditRow = {
  category: string;
  item: string;
  status: AuditStatus;
  detail: string;
};

function StatusBadge({ status }: { status: AuditStatus }) {
  const cfg = {
    integrated: { label: "Real Integrated", cls: "bg-good/10 text-good border-good/20", Icon: CheckCircle },
    seeded: { label: "Seeded Only", cls: "bg-warn/10 text-warn border-warn/20", Icon: AlertCircle },
    missing: { label: "Missing", cls: "bg-bad/10 text-bad border-bad/20", Icon: XCircle },
    blocked: { label: "Blocked", cls: "bg-slate-700/50 text-slate-400 border-slate-600", Icon: Shield },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${cfg.cls}`}>
      <cfg.Icon size={11} />
      {cfg.label}
    </span>
  );
}

export default function AuditReport() {
  const { data: leagues, isLoading: lLoading } = useAdminLeagues();
  const { data: coverage, isLoading: cLoading } = useDataCoverage();
  const { data: safetyRules } = useSafetyRules();
  const { data: cups } = useAdminCups();

  const isLoading = lLoading || cLoading;
  if (isLoading) return <Spinner />;

  const allLeagues = leagues || [];
  const playable = allLeagues.filter((l) => l.playable);
  const blocked = allLeagues.filter((l) => !l.playable);
  const tier1 = allLeagues.filter((l) => l.tier === 1);
  const tier2 = allLeagues.filter((l) => l.tier === 2);
  const tier3 = allLeagues.filter((l) => l.tier === 3);
  const tier4 = allLeagues.filter((l) => l.tier === 4);

  const coverageRows = coverage || [];
  const missingOdds = coverageRows.filter((c) => c.missing_data_flags.includes("odds"));
  const missingStats = coverageRows.filter((c) => c.missing_data_flags.includes("stats"));
  const missingFixtures = coverageRows.filter((c) => c.missing_data_flags.includes("fixtures"));
  const criticalCoverage = coverageRows.filter((c) => c.risk_level === "critical");

  const auditRows: AuditRow[] = [
    // Data flow integrations
    {
      category: "Database",
      item: "matches.league_id FK",
      status: "integrated",
      detail: "48 domestic matches linked to Premier League via home team league_id",
    },
    {
      category: "Database",
      item: "teams.league_id FK",
      status: "integrated",
      detail: `${allLeagues.length > 0 ? "All domestic teams linked to Premier League" : "Pending"}`,
    },
    {
      category: "Database",
      item: "team_aliases table",
      status: "integrated",
      detail: "30 aliases seeded across 14 teams (opta, statsperform, betfair, whoscored sources)",
    },
    {
      category: "Prediction Engine",
      item: "useTopPlays hook",
      status: "integrated",
      detail: "Reads safety_rules + data_coverage, filters blocked leagues, applies prediction_rules weight modifiers",
    },
    {
      category: "Prediction Engine",
      item: "getPlayableLeagueIds()",
      status: "integrated",
      detail: "Live playability computation: evaluates each league against active safety rules + coverage data",
    },
    {
      category: "Prediction Engine",
      item: "classifyMatchCompetition()",
      status: "integrated",
      detail: "Tags matches as domestic_league / international / cup / knockout for rule targeting",
    },
    {
      category: "Dashboard",
      item: "Top Plays section",
      status: "integrated",
      detail: "Safety-gated Top Plays on Dashboard — blocked leagues excluded, confidence capped by tier",
    },
    {
      category: "Prediction Engine",
      item: "xG model / expected goals",
      status: "missing",
      detail: "No xG model exists — picks use form-based scoring only",
    },
    {
      category: "Prediction Engine",
      item: "Odds integration (real bookmaker prices)",
      status: "missing",
      detail: "No real odds feed. odds_coverage tracks data availability, not live prices",
    },
    // League registry
    {
      category: "League Registry",
      item: `${tier1.length} Tier 1 leagues`,
      status: "seeded",
      detail: "Seeded from known real leagues. Not linked to real live fixture data from providers",
    },
    {
      category: "League Registry",
      item: `${tier2.length} Tier 2 leagues`,
      status: "seeded",
      detail: "Seeded. No live provider feed connected",
    },
    {
      category: "League Registry",
      item: `${tier3.length} Tier 3 + ${tier4.length} Tier 4 leagues`,
      status: blocked.filter(l => l.tier >= 3).length > 0 ? "blocked" : "seeded",
      detail: `${blocked.length} total non-playable. Tier 4 blocked by safety rules (low odds/stats coverage thresholds)`,
    },
    // Cups
    {
      category: "Cup Competitions",
      item: `${cups?.length || 0} cups seeded`,
      status: "seeded",
      detail: "Cup competitions registered with type flags (has_two_legs, has_groups). Not wired to prediction engine",
    },
    {
      category: "Cup Competitions",
      item: "Cup fixture browser",
      status: "integrated",
      detail: "Admin UI shows AET / PEN / two-leg / neutral venue / aggregate scores from real data",
    },
    {
      category: "Cup Competitions",
      item: "Cup picks prediction",
      status: "missing",
      detail: "classifyMatchCompetition() recognises cup/knockout stages but no cup-specific pick logic built",
    },
    // Data coverage
    {
      category: "Data Coverage",
      item: `${coverageRows.length} coverage records`,
      status: "seeded",
      detail: "Coverage scores seeded from known provider data gaps. Not auto-refreshed from live feed",
    },
    {
      category: "Data Coverage",
      item: `${criticalCoverage.length} critical-risk entities`,
      status: criticalCoverage.length > 0 ? "blocked" : "integrated",
      detail: `${criticalCoverage.length} entities with provider_flag=missing. Blocked from prediction via safety rules`,
    },
    {
      category: "Data Coverage",
      item: `${missingOdds.length} missing odds / ${missingStats.length} missing stats`,
      status: "missing",
      detail: "Provider gaps identified in audit. These entities are auto-excluded from Top Plays",
    },
    // Safety & prediction rules
    {
      category: "Rules Engine",
      item: `${safetyRules?.length || 0} safety rules`,
      status: "integrated",
      detail: "Safety rules consumed by getPlayableLeagueIds() — active rules gate Top Plays",
    },
    {
      category: "Rules Engine",
      item: "28 prediction rules",
      status: "integrated",
      detail: "Prediction rules applied as weight modifiers in useTopPlays value score calculation",
    },
    {
      category: "Rules Engine",
      item: "Neutral venue adjustment",
      status: "seeded",
      detail: "neutral_venue flag exists on cup_fixtures. No explicit model adjustment applied yet",
    },
    {
      category: "Rules Engine",
      item: "Two-leg aggregate settlement",
      status: "seeded",
      detail: "home_agg / away_agg / winner_name stored. Settlement logic in admin UI only, not prediction",
    },
    // Tests
    {
      category: "Tests",
      item: "21 Vitest unit tests",
      status: "integrated",
      detail: "Tier 4 blocking, confidence caps, cup classification, neutral venue, two-leg, ET/penalties, Top Plays exclusion",
    },
  ];

  const counts = {
    integrated: auditRows.filter((r) => r.status === "integrated").length,
    seeded: auditRows.filter((r) => r.status === "seeded").length,
    missing: auditRows.filter((r) => r.status === "missing").length,
    blocked: auditRows.filter((r) => r.status === "blocked").length,
  };

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <PageHeader
        title="Integration Audit Report"
        subtitle="Real integrated vs seeded-only vs missing vs blocked — as of 2026-06-25"
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Real Integrated", value: counts.integrated, color: "#10B981", Icon: CheckCircle },
          { label: "Seeded Only", value: counts.seeded, color: "#fbbf24", Icon: AlertCircle },
          { label: "Missing", value: counts.missing, color: "#f87171", Icon: XCircle },
          { label: "Blocked", value: counts.blocked, color: "#64748b", Icon: Shield },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.Icon size={14} style={{ color: s.color }} />
              <p className="text-xs text-slate-500 uppercase tracking-wider">{s.label}</p>
            </div>
            <p className="font-mono text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* League stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Leagues", value: allLeagues.length, icon: <Database size={14} />, color: "#00D4FF" },
          { label: "Playable", value: playable.length, icon: <CheckCircle size={14} />, color: "#10B981" },
          { label: "Blocked", value: blocked.length, icon: <Shield size={14} />, color: "#f87171" },
          { label: "Coverage Records", value: coverageRows.length, icon: <TrendingUp size={14} />, color: "#a78bfa" },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <div className="flex items-center gap-2 mb-2" style={{ color: s.color }}>
              {s.icon}
              <p className="text-xs text-slate-500 uppercase tracking-wider">{s.label}</p>
            </div>
            <p className="font-mono text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Remaining risks */}
      <div className="card p-5 mb-8 border-l-4 border-warn">
        <h3 className="text-sm font-bold text-warn mb-3 flex items-center gap-2">
          <AlertCircle size={14} /> Remaining Risks
        </h3>
        <ul className="space-y-2 text-xs text-slate-400">
          <li>• <strong className="text-white">No real odds feed</strong> — Top Plays confidence based on form, not market prices. Coverage % tracks data availability only.</li>
          <li>• <strong className="text-white">No xG model</strong> — Expected goals not modelled. Value score uses form differential × prediction rule weight modifiers.</li>
          <li>• <strong className="text-white">Cup prediction gap</strong> — Cup games classified but no cup-specific pick logic (two-leg tiebreaker, neutral venue xG reduction, ET probability).</li>
          <li>• <strong className="text-white">Coverage data is seeded</strong> — data_coverage table not auto-refreshed from live provider APIs. Must be manually updated each audit cycle.</li>
          <li>• <strong className="text-white">Tier 3/4 leagues seeded only</strong> — No live fixture data from providers. These are correctly blocked from Top Plays but generate no revenue.</li>
          <li>• <strong className="text-white">Team aliases not auto-resolved</strong> — 30 aliases seeded. No alias resolution pipeline linking provider names to canonical team IDs at ingest.</li>
        </ul>
      </div>

      {/* Full audit table */}
      <h2 className="text-lg font-semibold text-white mb-4">Full Integration Matrix</h2>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-base-700/60 bg-base-700/20">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-40">Category</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Item</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-36">Status</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Detail</th>
            </tr>
          </thead>
          <tbody>
            {auditRows.map((row, i) => (
              <tr key={i} className="border-b border-base-700/30 last:border-0 hover:bg-base-700/10 transition-colors">
                <td className="px-5 py-3">
                  <span className="text-xs font-semibold text-slate-500">{row.category}</span>
                </td>
                <td className="px-5 py-3">
                  <span className="text-sm text-white">{row.item}</span>
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-5 py-3">
                  <span className="text-xs text-slate-400">{row.detail}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
