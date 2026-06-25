import { useMemo } from "react";
import { useAdminLeagues, useAdminCups, useOddsProviders, useCoverageRefreshLog, useDataCoverage } from "../../lib/adminHooks";
import { PageHeader, Spinner } from "../../components/ui";
import {
  CircleCheck as CheckCircle,
  CircleX as XCircle,
  CircleAlert as AlertCircle,
  Radio,
  Lock,
  Database,
  Trophy,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { buildModelFlags, MIN_CUP_FIXTURES } from "../../lib/modelFlags";

// ============================================================
// CERTIFICATION STATUS
// ============================================================

type CertStatus =
  | "LIVE_READY"
  | "DEMO_ONLY"
  | "BLOCKED"
  | "MISSING_ODDS"
  | "MISSING_MODEL_DATA"
  | "MISSING_SETTLEMENT"
  | "NEEDS_PROVIDER_DATA";

const CERT_CFG: Record<CertStatus, { label: string; color: string; Icon: any }> = {
  LIVE_READY:           { label: "LIVE READY",          color: "#10B981", Icon: CheckCircle },
  DEMO_ONLY:            { label: "DEMO ONLY",           color: "#fbbf24", Icon: AlertCircle },
  BLOCKED:              { label: "BLOCKED",             color: "#64748b", Icon: Lock },
  MISSING_ODDS:         { label: "MISSING ODDS",        color: "#f87171", Icon: XCircle },
  MISSING_MODEL_DATA:   { label: "MISSING MODEL DATA",  color: "#f97316", Icon: Database },
  MISSING_SETTLEMENT:   { label: "MISSING SETTLEMENT",  color: "#a78bfa", Icon: TrendingUp },
  NEEDS_PROVIDER_DATA:  { label: "NEEDS PROVIDER DATA", color: "#00D4FF", Icon: RefreshCw },
};

function CertBadge({ status }: { status: CertStatus }) {
  const cfg = CERT_CFG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold"
      style={{ color: cfg.color, borderColor: `${cfg.color}33`, backgroundColor: `${cfg.color}10` }}
    >
      <cfg.Icon size={11} />
      {cfg.label}
    </span>
  );
}

type CertRow = {
  category: string;
  name: string;
  tier?: number | string;
  cert: CertStatus;
  reason: string;
  model_tier: string;
};

function leagueCertStatus(league: any, coverage: any): CertStatus {
  if (league.is_synthetic) return "DEMO_ONLY";
  if (!league.has_live_odds) return "MISSING_ODDS";
  if (!league.playable) return "BLOCKED";
  if (coverage?.risk_level === "critical") return "NEEDS_PROVIDER_DATA";
  if (coverage?.missing_data_flags?.includes("settlement")) return "MISSING_SETTLEMENT";
  if (coverage?.missing_data_flags?.includes("stats")) return "MISSING_MODEL_DATA";
  if (coverage?.overall_score >= 70) return "LIVE_READY";
  return "NEEDS_PROVIDER_DATA";
}

function cupCertStatus(cup: any, sampleSize: number): CertStatus {
  if (!cup.playable) return "BLOCKED";
  if (!cup.has_fixtures) return "MISSING_SETTLEMENT";
  if (sampleSize < MIN_CUP_FIXTURES) return "MISSING_MODEL_DATA";
  if (!cup.has_odds) return "MISSING_ODDS";
  return "NEEDS_PROVIDER_DATA"; // cups need real provider data before LIVE_READY
}

export default function Certification() {
  const { data: leagues, isLoading: lLoading } = useAdminLeagues();
  const { data: cups, isLoading: cLoading } = useAdminCups();
  const { data: providers } = useOddsProviders();
  const { data: refreshLog } = useCoverageRefreshLog(5);
  const { data: coverage } = useDataCoverage();

  const isLoading = lLoading || cLoading;
  if (isLoading) return <Spinner />;

  const coverageMap = new Map(
    (coverage || []).map((c) => [c.entity_id, c])
  );

  const allLeagues = leagues || [];
  const allCups = cups || [];

  // Build certification rows for leagues
  const leagueRows: CertRow[] = allLeagues.map((l: any) => {
    const cov = coverageMap.get(l.id);
    const cert = leagueCertStatus(l, cov);
    const flags = buildModelFlags({
      has_live_odds: l.has_live_odds ?? false,
      has_xg: false,
      has_stats: (cov?.stats_coverage ?? 0) >= 50,
      has_settlement: (cov?.standings_coverage ?? 0) >= 30,
      has_trusted_market: l.has_live_odds ?? false,
    });
    return {
      category: "League",
      name: l.name,
      tier: `T${l.tier}`,
      cert,
      reason: cert === "LIVE_READY"
        ? `Tier ${l.tier} · ${cov?.odds_coverage ?? 0}% odds · ${cov?.stats_coverage ?? 0}% stats`
        : cert === "DEMO_ONLY"
        ? "Synthetic league — demo data only"
        : cert === "MISSING_ODDS"
        ? "has_live_odds=false — no provider connected"
        : cert === "BLOCKED"
        ? "playable=false in registry"
        : cert === "MISSING_SETTLEMENT"
        ? "settlement coverage below threshold"
        : cert === "MISSING_MODEL_DATA"
        ? "stats coverage below 50%"
        : `overall_score=${cov?.overall_score ?? 0} — needs provider data`,
      model_tier: flags.model_tier,
    };
  });

  // Build certification rows for cups
  const cupRows: CertRow[] = allCups.map((c: any) => {
    // Use has_fixtures as proxy for sample size (no real sample available without live data)
    const sampleProxy = c.has_fixtures ? 5 : 0; // conservative: below MIN_CUP_FIXTURES
    const cert = cupCertStatus(c, sampleProxy);
    return {
      category: "Cup",
      name: c.name,
      tier: c.competition_type,
      cert,
      reason: cert === "BLOCKED"
        ? "playable=false"
        : cert === "MISSING_MODEL_DATA"
        ? `Cup historical sample ${sampleProxy} < ${MIN_CUP_FIXTURES} required for ET/pen probability`
        : cert === "MISSING_ODDS"
        ? "no odds provider connected"
        : cert === "MISSING_SETTLEMENT"
        ? "no fixture data"
        : "Needs real provider feed to reach LIVE_READY",
      model_tier: "form_only",
    };
  });

  const allRows = [...leagueRows, ...cupRows];

  const counts = Object.fromEntries(
    Object.keys(CERT_CFG).map((k) => [k, allRows.filter((r) => r.cert === k).length])
  ) as Record<CertStatus, number>;

  const activeProviders = (providers || []).filter((p) => p.status === "active");
  const lastRefresh = refreshLog?.[0];

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <PageHeader
        title="Production Certification"
        subtitle="LIVE READY · DEMO ONLY · BLOCKED · MISSING ODDS · MISSING MODEL DATA · MISSING SETTLEMENT · NEEDS PROVIDER DATA"
      />

      {/* Provider health */}
      <div className="card p-5 mb-6 border-l-4" style={{ borderColor: activeProviders.length > 0 ? "#10B981" : "#f87171" }}>
        <div className="flex items-center gap-3 mb-3">
          <Radio size={14} className={activeProviders.length > 0 ? "text-good" : "text-bad"} />
          <h3 className="text-sm font-bold text-white">Odds Provider Status</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(providers || []).map((p) => {
            const statusColor = p.status === "active" ? "#10B981" : p.status === "error" ? "#f87171" : p.status === "stale" ? "#fbbf24" : "#64748b";
            return (
              <div key={p.id} className="rounded-xl p-3 bg-base-700/30 border border-base-600/30">
                <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                <p className="text-xs font-bold mt-1" style={{ color: statusColor }}>
                  {p.status.toUpperCase()}
                </p>
                {p.last_success_at && (
                  <p className="text-xs text-slate-600 mt-0.5 truncate">
                    Last: {new Date(p.last_success_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        {activeProviders.length === 0 && (
          <p className="text-xs text-bad mt-3">
            No odds providers active. All leagues will remain BLOCKED_PICK until a provider is connected and has_live_odds is synced.
          </p>
        )}
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
              {lastRefresh.leagues_refreshed ?? 0} leagues · {lastRefresh.status} · triggered by {lastRefresh.triggered_by}
            </p>
          </div>
        </div>
      )}

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
        {(Object.entries(CERT_CFG) as [CertStatus, typeof CERT_CFG[CertStatus]][]).map(([key, cfg]) => (
          <div key={key} className="card p-3 text-center">
            <cfg.Icon size={14} className="mx-auto mb-1" style={{ color: cfg.color }} />
            <p className="font-mono text-xl font-bold" style={{ color: cfg.color }}>{counts[key]}</p>
            <p className="text-xs text-slate-600 mt-0.5 leading-tight">{cfg.label}</p>
          </div>
        ))}
      </div>

      {/* LIVE READY summary */}
      {counts.LIVE_READY === 0 && (
        <div className="card p-5 mb-6 border border-bad/30 bg-bad/5">
          <div className="flex items-start gap-3">
            <XCircle size={16} className="text-bad shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-bad">Zero leagues are LIVE READY</p>
              <p className="text-xs text-slate-400 mt-1">
                To reach LIVE READY: connect an odds provider → set api_endpoint + API key → call
                {" "}<code className="text-xs bg-base-700/60 px-1 rounded">sync_league_live_odds_flag()</code>{" "}
                after successful ingestion → run coverage refresh. Once a league has
                {" "}<code className="text-xs bg-base-700/60 px-1 rounded">has_live_odds=true</code>{" "}
                and meets safety rule thresholds, it will show LIVE_PICK in Top Plays.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Full certification matrix */}
      <h2 className="text-lg font-semibold text-white mb-4">Full Certification Matrix</h2>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-base-700/60 bg-base-700/20">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-20">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-16">Tier</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-48">Certification</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-32">Model</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Reason</th>
            </tr>
          </thead>
          <tbody>
            {allRows.map((row, i) => (
              <tr key={i} className="border-b border-base-700/30 last:border-0 hover:bg-base-700/10 transition-colors">
                <td className="px-4 py-2.5">
                  <span className="text-xs font-semibold text-slate-500">{row.category}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-sm text-white">{row.name}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-xs text-slate-500 font-mono">{row.tier}</span>
                </td>
                <td className="px-4 py-2.5">
                  <CertBadge status={row.cert} />
                </td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs font-semibold ${row.model_tier === "full_model" ? "text-good" : row.model_tier === "odds_form" ? "text-accent" : "text-slate-500"}`}>
                    {row.model_tier.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-xs text-slate-400">{row.reason}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
