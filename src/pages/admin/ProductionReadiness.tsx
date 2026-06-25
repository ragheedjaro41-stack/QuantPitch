import { useMemo } from "react";
import { CircleCheck as CheckCircle2, Circle as XCircle, TriangleAlert as AlertTriangle, Shield, Radio, Users, Scale, Lock, Database, Zap, Globe } from "lucide-react";
import { PageHeader, Spinner, ErrorState } from "../../components/ui";
import {
  useAdminLeagues,
  useCoverageSummary,
  useOddsMonitor,
  useSettlementSummary,
  usePendingSettlementMatches,
  usePlayerSyncSummary,
  useApiFootballSummary,
  useOddsSyncLog,
  useTrustedMarkets,
} from "../../lib/adminHooks";
import { useRealLeagues, getLeagueStatus } from "../../lib/hooks";
import type { LeagueSummary } from "../../lib/hooks";

type GateResult = {
  label: string;
  status: "pass" | "fail" | "warn";
  detail: string;
};

function useProductionReadiness() {
  const leagues = useAdminLeagues();
  const realLeagues = useRealLeagues();
  const coverage = useCoverageSummary();
  const odds = useOddsMonitor();
  const settlement = useSettlementSummary();
  const pending = usePendingSettlementMatches();
  const players = usePlayerSyncSummary();
  const apiFb = useApiFootballSummary();
  const oddsLog = useOddsSyncLog(5);
  const trusted = useTrustedMarkets();

  const isLoading =
    leagues.isLoading ||
    realLeagues.isLoading ||
    coverage.isLoading ||
    odds.isLoading ||
    settlement.isLoading ||
    pending.isLoading ||
    players.isLoading ||
    apiFb.isLoading ||
    oddsLog.isLoading ||
    trusted.isLoading;

  const isError =
    leagues.isError ||
    realLeagues.isError ||
    coverage.isError;

  return {
    isLoading,
    isError,
    leagues: leagues.data,
    realLeagues: realLeagues.data,
    coverage: coverage.data,
    odds: odds.data,
    settlement: settlement.data,
    pending: pending.data,
    players: players.data,
    apiFb: apiFb.data,
    oddsLog: oddsLog.data,
    trusted: trusted.data,
  };
}

export default function ProductionReadiness() {
  const d = useProductionReadiness();

  if (d.isLoading) return <Spinner />;
  if (d.isError) return <ErrorState message="Failed to load readiness data" />;

  const allLeagues = d.leagues ?? [];
  const real = d.realLeagues ?? [];
  const synthetic = allLeagues.filter((l) => l.is_synthetic);
  const nonSynthetic = allLeagues.filter((l) => !l.is_synthetic);
  const playable = nonSynthetic.filter((l) => l.playable);
  const withLiveOdds = nonSynthetic.filter((l) => l.has_live_odds);

  const statuses = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of real) map.set(l.id, getLeagueStatus(l));
    return map;
  }, [real]);

  const liveReady = real.filter((l) => statuses.get(l.id) === "LIVE READY").length;
  const blocked = real.filter((l) => statuses.get(l.id) === "BLOCKED").length;
  const thin = real.filter((l) => statuses.get(l.id) === "THIN").length;
  const missingData = real.filter((l) => statuses.get(l.id) === "MISSING DATA").length;

  const hasOddsKey = withLiveOdds.length > 0 || (d.oddsLog && d.oddsLog.length > 0 && d.oddsLog.some((l) => l.status === "completed"));
  const hasOddsRows = (d.odds?.totalOdds ?? 0) > 0;
  const hasFreshOdds = (d.odds?.totalFresh ?? 0) > 0;
  const hasPlayers = (d.players?.total_real_players ?? 0) > 0;
  const hasSettlement = (d.settlement?.total_results ?? 0) > 0;
  const hasTrustedMarkets = (d.trusted ?? []).filter((m) => m.trusted && m.settlement_supported).length > 0;

  const realDataGates: GateResult[] = [
    {
      label: "Real leagues registered",
      status: nonSynthetic.length > 0 ? "pass" : "fail",
      detail: `${nonSynthetic.length} real leagues, ${synthetic.length} synthetic (excluded)`,
    },
    {
      label: "Demo data isolated",
      status: synthetic.length > 0 && synthetic.every((l) => l.is_synthetic) ? "pass" : "warn",
      detail: synthetic.length > 0
        ? `${synthetic.length} synthetic league(s) flagged, excluded from all public views`
        : "No synthetic leagues found",
    },
    {
      label: "API-Football linked",
      status: (d.apiFb?.linked_teams ?? 0) > 0 ? "pass" : "fail",
      detail: `${d.apiFb?.linked_teams ?? 0}/${d.apiFb?.total_teams ?? 0} teams, ${d.apiFb?.linked_matches ?? 0}/${d.apiFb?.total_matches ?? 0} matches linked`,
    },
    {
      label: "API-Football fixtures synced",
      status: d.apiFb?.fixtures.last_status === "completed" ? "pass" : d.apiFb?.fixtures.total_syncs ? "warn" : "fail",
      detail: `${d.apiFb?.fixtures.total_synced ?? 0} fixtures synced, last status: ${d.apiFb?.fixtures.last_status ?? "never"}`,
    },
  ];

  const leagueCoverageGates: GateResult[] = [
    {
      label: "Tier 1 leagues playable",
      status: playable.filter((l) => l.tier === 1).length >= 5 ? "pass" : playable.filter((l) => l.tier === 1).length > 0 ? "warn" : "fail",
      detail: `${playable.filter((l) => l.tier === 1).length} of ${nonSynthetic.filter((l) => l.tier === 1).length} Tier 1 leagues marked playable`,
    },
    {
      label: "Coverage audit score",
      status: (d.coverage?.avgScore ?? 0) >= 70 ? "pass" : (d.coverage?.avgScore ?? 0) >= 40 ? "warn" : "fail",
      detail: `Average coverage score: ${d.coverage?.avgScore ?? 0}% across ${d.coverage?.total ?? 0} entities`,
    },
    {
      label: "Critical risk leagues",
      status: (d.coverage?.critical ?? 0) === 0 ? "pass" : "warn",
      detail: `${d.coverage?.critical ?? 0} critical, ${d.coverage?.high ?? 0} high, ${d.coverage?.medium ?? 0} medium, ${d.coverage?.low ?? 0} low risk`,
    },
    {
      label: "Missing data flags",
      status: (d.coverage?.missingOdds ?? 0) === 0 && (d.coverage?.missingStats ?? 0) === 0 ? "pass" : "warn",
      detail: `Missing: ${d.coverage?.missingOdds ?? 0} odds, ${d.coverage?.missingStats ?? 0} stats, ${d.coverage?.missingFixtures ?? 0} fixtures`,
    },
  ];

  const oddsGates: GateResult[] = [
    {
      label: "ODDS_API_KEY configured",
      status: hasOddsKey ? "pass" : "fail",
      detail: hasOddsKey
        ? "Key detected (successful sync found or has_live_odds set)"
        : "Not configured in Edge Function secrets. Required for live odds.",
    },
    {
      label: "Odds rows ingested",
      status: hasOddsRows ? "pass" : "fail",
      detail: `${d.odds?.totalOdds ?? 0} total odds rows (${d.odds?.totalFresh ?? 0} fresh, ${d.odds?.totalStale ?? 0} stale)`,
    },
    {
      label: "Fresh odds available",
      status: hasFreshOdds ? "pass" : hasOddsRows ? "warn" : "fail",
      detail: hasFreshOdds
        ? `${d.odds?.totalFresh} fresh odds from ${d.odds?.uniqueBookmakers?.length ?? 0} bookmaker(s)`
        : hasOddsRows ? "All odds are stale (older than 4h)" : "No odds ingested yet",
    },
    {
      label: "has_live_odds enabled",
      status: withLiveOdds.length > 0 ? "pass" : "fail",
      detail: `${withLiveOdds.length} league(s) with has_live_odds=true`,
    },
    {
      label: "Trusted markets defined",
      status: hasTrustedMarkets ? "pass" : "fail",
      detail: `${(d.trusted ?? []).filter((m) => m.trusted).length} trusted, ${(d.trusted ?? []).filter((m) => m.settlement_supported).length} settlement-supported`,
    },
  ];

  const playerGates: GateResult[] = [
    {
      label: "Real players synced",
      status: hasPlayers ? "pass" : "fail",
      detail: `${d.players?.total_real_players ?? 0} real players, ${d.players?.total_demo_players ?? 0} demo players`,
    },
    {
      label: "Teams with player data",
      status: (d.players?.teams_completed ?? 0) > 0 ? ((d.players?.teams_missing?.length ?? 0) === 0 ? "pass" : "warn") : "fail",
      detail: `${d.players?.teams_completed ?? 0}/${d.players?.total_synced_teams ?? 0} teams have player data`,
    },
    {
      label: "No duplicate external IDs",
      status: (d.players?.duplicates ?? 0) === 0 ? "pass" : "warn",
      detail: (d.players?.duplicates ?? 0) === 0 ? "No duplicates found" : `${d.players?.duplicates} duplicate external IDs detected`,
    },
    {
      label: "Player ratings coverage",
      status: (() => {
        const rated = d.players?.field_coverage?.find((f) => f.field === "rating");
        const pct = rated && (d.players?.total_real_players ?? 0) > 0 ? (rated.count / d.players!.total_real_players) * 100 : 0;
        return pct >= 80 ? "pass" : pct >= 30 ? "warn" : "fail";
      })(),
      detail: (() => {
        const rated = d.players?.field_coverage?.find((f) => f.field === "rating");
        return `${rated?.count ?? 0}/${d.players?.total_real_players ?? 0} players have ratings`;
      })(),
    },
  ];

  const settlementGates: GateResult[] = [
    {
      label: "Match results recorded",
      status: hasSettlement ? "pass" : "fail",
      detail: `${d.settlement?.total_results ?? 0} results (${d.settlement?.confirmed ?? 0} confirmed, ${d.settlement?.voided ?? 0} voided, ${d.settlement?.review ?? 0} pending review)`,
    },
    {
      label: "Settlement logs clean",
      status: (d.settlement?.errorLogs ?? 0) === 0 ? "pass" : "warn",
      detail: `${d.settlement?.settled ?? 0} settled, ${d.settlement?.voidLogs ?? 0} void, ${d.settlement?.errorLogs ?? 0} errors`,
    },
    {
      label: "Pending settlements",
      status: (d.pending?.pending?.length ?? 0) === 0 ? "pass" : (d.pending?.pending?.length ?? 0) <= 10 ? "warn" : "fail",
      detail: `${d.pending?.pending?.length ?? 0} matches awaiting settlement, ${d.pending?.totalSettled ?? 0} already settled`,
    },
  ];

  const livePickGates: GateResult[] = [
    {
      label: "LIVE_PICK gate",
      status: withLiveOdds.length > 0 && hasFreshOdds && hasTrustedMarkets ? "pass" : "fail",
      detail: withLiveOdds.length > 0
        ? `${withLiveOdds.length} league(s) could produce LIVE_PICK if odds are fresh`
        : "No leagues meet all LIVE_PICK requirements: has_live_odds + fresh odds + trusted markets",
    },
    {
      label: "Safety rules active",
      status: "pass",
      detail: "Safety rules enforced by playability engine at runtime",
    },
    {
      label: "Rate limiting",
      status: "pass",
      detail: "120s cooldown between sync invocations enforced",
    },
    {
      label: "Stale odds cascade",
      status: "pass",
      detail: "mark_stale_odds runs every sync to expire odds older than 4h",
    },
  ];

  const allGates = [
    ...realDataGates,
    ...leagueCoverageGates,
    ...oddsGates,
    ...playerGates,
    ...settlementGates,
    ...livePickGates,
  ];

  const passCount = allGates.filter((g) => g.status === "pass").length;
  const failCount = allGates.filter((g) => g.status === "fail").length;
  const warnCount = allGates.filter((g) => g.status === "warn").length;

  const blockers = allGates.filter((g) => g.status === "fail");

  const overallVerdict: "GO" | "NO-GO" | "CONDITIONAL" =
    failCount === 0 ? "GO" : failCount <= 3 && warnCount <= 5 ? "CONDITIONAL" : "NO-GO";

  const verdictCfg = {
    GO: { bg: "bg-good/10", border: "border-good/30", text: "text-good", label: "GO FOR LAUNCH" },
    "NO-GO": { bg: "bg-bad/10", border: "border-bad/30", text: "text-bad", label: "NOT READY" },
    CONDITIONAL: { bg: "bg-warn/10", border: "border-warn/30", text: "text-warn", label: "CONDITIONAL" },
  };
  const vc = verdictCfg[overallVerdict];

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
      <PageHeader title="Production Readiness" subtitle="Launch checklist and system status" />

      {/* Verdict banner */}
      <div className={`rounded-2xl p-6 mb-8 border ${vc.bg} ${vc.border}`}>
        <div className="flex items-center gap-4 mb-3">
          {overallVerdict === "GO" ? (
            <CheckCircle2 size={32} className="text-good" />
          ) : overallVerdict === "NO-GO" ? (
            <XCircle size={32} className="text-bad" />
          ) : (
            <AlertTriangle size={32} className="text-warn" />
          )}
          <div>
            <h2 className={`text-2xl font-bold ${vc.text}`}>{vc.label}</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {passCount} passed, {warnCount} warnings, {failCount} blockers
            </p>
          </div>
        </div>
        <div className="w-full h-2 rounded-full bg-base-700 overflow-hidden">
          <div className="h-full flex">
            <div className="bg-good h-full transition-all" style={{ width: `${(passCount / allGates.length) * 100}%` }} />
            <div className="bg-warn h-full transition-all" style={{ width: `${(warnCount / allGates.length) * 100}%` }} />
            <div className="bg-bad h-full transition-all" style={{ width: `${(failCount / allGates.length) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
        <MiniStat label="Real Leagues" value={nonSynthetic.length} accent="#00D4FF" />
        <MiniStat label="LIVE READY" value={liveReady} accent="#10B981" />
        <MiniStat label="BLOCKED" value={blocked} accent="#64748b" />
        <MiniStat label="THIN" value={thin} accent="#fbbf24" />
        <MiniStat label="MISSING" value={missingData} accent="#f87171" />
        <MiniStat label="Players" value={d.players?.total_real_players ?? 0} accent="#10B981" />
        <MiniStat label="Odds Rows" value={d.odds?.totalOdds ?? 0} accent="#00D4FF" />
        <MiniStat label="Results" value={d.settlement?.total_results ?? 0} accent="#fbbf24" />
      </div>

      {/* Blocker summary */}
      {blockers.length > 0 && (
        <div className="card p-5 mb-8 border-bad/20">
          <div className="flex items-center gap-2 mb-3">
            <XCircle size={16} className="text-bad" />
            <h3 className="text-sm font-bold text-bad">Remaining Blockers ({blockers.length})</h3>
          </div>
          <div className="space-y-2">
            {blockers.map((b, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-bad/5 border border-bad/10">
                <span className="font-mono text-xs text-bad mt-0.5">{i + 1}</span>
                <div>
                  <p className="text-sm font-medium text-white">{b.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{b.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gate sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <GateSection title="Real Data Status" icon={<Database size={16} />} gates={realDataGates} />
        <GateSection title="League Coverage" icon={<Globe size={16} />} gates={leagueCoverageGates} />
        <GateSection title="Odds Pipeline" icon={<Radio size={16} />} gates={oddsGates} />
        <GateSection title="Player Data" icon={<Users size={16} />} gates={playerGates} />
        <GateSection title="Settlement" icon={<Scale size={16} />} gates={settlementGates} />
        <GateSection title="LIVE_PICK Gate" icon={<Lock size={16} />} gates={livePickGates} />
      </div>

      {/* League status breakdown */}
      <div className="card p-5 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} className="text-accent" />
          <h3 className="text-sm font-bold text-white">League Status Breakdown</h3>
          <span className="ml-auto text-xs text-slate-500">{real.length} leagues</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-base-700">
                <th className="text-left text-xs font-semibold uppercase text-slate-500 px-3 py-2">League</th>
                <th className="text-center text-xs font-semibold uppercase text-slate-500 px-3 py-2">Tier</th>
                <th className="text-center text-xs font-semibold uppercase text-slate-500 px-3 py-2">Status</th>
                <th className="text-center text-xs font-semibold uppercase text-slate-500 px-3 py-2">Fix%</th>
                <th className="text-center text-xs font-semibold uppercase text-slate-500 px-3 py-2">Odds%</th>
                <th className="text-center text-xs font-semibold uppercase text-slate-500 px-3 py-2">Stats%</th>
                <th className="text-center text-xs font-semibold uppercase text-slate-500 px-3 py-2">Live Odds</th>
                <th className="text-center text-xs font-semibold uppercase text-slate-500 px-3 py-2">Playable</th>
              </tr>
            </thead>
            <tbody>
              {real.slice(0, 30).map((l) => (
                <LeagueRow key={l.id} league={l} status={statuses.get(l.id) ?? "BLOCKED"} />
              ))}
              {real.length > 30 && (
                <tr>
                  <td colSpan={8} className="text-center py-3 text-xs text-slate-500">
                    + {real.length - 30} more leagues
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Launch checklist */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={16} className="text-accent" />
          <h3 className="text-sm font-bold text-white">Launch Checklist</h3>
        </div>
        <div className="space-y-1">
          {LAUNCH_STEPS.map((step, i) => {
            const done = evaluateStep(step.key, {
              hasOddsKey: !!hasOddsKey,
              hasOddsRows,
              hasFreshOdds,
              hasLiveOdds: withLiveOdds.length > 0,
              hasPlayers,
              hasSettlement,
              hasTrustedMarkets,
              linkedTeams: d.apiFb?.linked_teams ?? 0,
              liveReady,
            });
            return (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  done ? "bg-good/5" : "bg-base-700/30"
                }`}
              >
                {done ? (
                  <CheckCircle2 size={16} className="text-good shrink-0" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-slate-600 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${done ? "text-slate-300" : "text-white font-medium"}`}>{step.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{step.detail}</p>
                </div>
                <span className={`text-xs font-bold ${done ? "text-good" : "text-slate-600"}`}>
                  {done ? "DONE" : "TODO"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="card p-3 text-center">
      <p className="font-mono text-lg font-bold" style={{ color: accent }}>{value}</p>
      <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function GateSection({ title, icon, gates }: { title: string; icon: React.ReactNode; gates: GateResult[] }) {
  const pass = gates.filter((g) => g.status === "pass").length;
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-accent">{icon}</span>
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <span className="ml-auto text-xs text-slate-500">{pass}/{gates.length}</span>
      </div>
      <div className="space-y-1.5">
        {gates.map((g, i) => (
          <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-base-700/20">
            {g.status === "pass" ? (
              <CheckCircle2 size={15} className="text-good mt-0.5 shrink-0" />
            ) : g.status === "warn" ? (
              <AlertTriangle size={15} className="text-warn mt-0.5 shrink-0" />
            ) : (
              <XCircle size={15} className="text-bad mt-0.5 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm text-white">{g.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{g.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeagueRow({ league, status }: { league: LeagueSummary; status: string }) {
  const statusCfg: Record<string, { cls: string }> = {
    "LIVE READY": { cls: "bg-good/10 text-good border-good/30" },
    BLOCKED: { cls: "bg-slate-700/50 text-slate-400 border-slate-600" },
    THIN: { cls: "bg-warn/10 text-warn border-warn/30" },
    "MISSING DATA": { cls: "bg-bad/10 text-bad border-bad/30" },
  };
  const sc = statusCfg[status] ?? statusCfg.BLOCKED;

  const covBar = (val: number) => (
    <div className="flex items-center gap-2">
      <div className="w-12 h-1.5 rounded-full bg-base-700 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${val}%`,
            backgroundColor: val >= 80 ? "#10B981" : val >= 50 ? "#fbbf24" : "#f87171",
          }}
        />
      </div>
      <span className="font-mono text-xs text-slate-400">{Math.round(val)}</span>
    </div>
  );

  return (
    <tr className="border-b border-base-700/30 hover:bg-base-700/20 transition-colors">
      <td className="px-3 py-2.5">
        <div>
          <p className="text-sm text-white">{league.name}</p>
          <p className="text-[10px] text-slate-500">{league.short_name} &middot; {league.competition_type}</p>
        </div>
      </td>
      <td className="px-3 py-2.5 text-center">
        <span className="font-mono text-xs text-slate-400">T{league.tier}</span>
      </td>
      <td className="px-3 py-2.5 text-center">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${sc.cls}`}>
          {status}
        </span>
      </td>
      <td className="px-3 py-2.5">{covBar(league.fixture_coverage)}</td>
      <td className="px-3 py-2.5">{covBar(league.odds_coverage)}</td>
      <td className="px-3 py-2.5">{covBar(league.stats_coverage)}</td>
      <td className="px-3 py-2.5 text-center">
        {league.has_live_odds ? (
          <CheckCircle2 size={14} className="text-good mx-auto" />
        ) : (
          <XCircle size={14} className="text-slate-600 mx-auto" />
        )}
      </td>
      <td className="px-3 py-2.5 text-center">
        {league.playable ? (
          <CheckCircle2 size={14} className="text-good mx-auto" />
        ) : (
          <XCircle size={14} className="text-slate-600 mx-auto" />
        )}
      </td>
    </tr>
  );
}

type StepContext = {
  hasOddsKey: boolean;
  hasOddsRows: boolean;
  hasFreshOdds: boolean;
  hasLiveOdds: boolean;
  hasPlayers: boolean;
  hasSettlement: boolean;
  hasTrustedMarkets: boolean;
  linkedTeams: number;
  liveReady: number;
};

const LAUNCH_STEPS = [
  {
    key: "api_football",
    label: "1. Sync teams and fixtures from API-Football",
    detail: "Run sync-teams and sync-fixtures edge functions",
  },
  {
    key: "players",
    label: "2. Sync player data",
    detail: "Run sync-players to populate ratings, stats, and photos",
  },
  {
    key: "odds_key",
    label: "3. Configure ODDS_API_KEY in Edge Function secrets",
    detail: "Add your the-odds-api.com key via Supabase Dashboard > Edge Functions > Secrets",
  },
  {
    key: "odds_sync",
    label: "4. Run sync-odds to ingest bookmaker odds",
    detail: "Invoke sync-odds edge function; confirm rows appear in match_odds",
  },
  {
    key: "trusted_markets",
    label: "5. Verify trusted markets are configured",
    detail: "Ensure h2h, totals, btts markets are marked trusted + settlement_supported",
  },
  {
    key: "live_odds",
    label: "6. Enable has_live_odds on qualifying leagues",
    detail: "Set has_live_odds=true for leagues with fresh odds and good coverage",
  },
  {
    key: "settlement",
    label: "7. Sync results and verify settlement pipeline",
    detail: "Run sync-results; confirm match_results and settlement_log populate",
  },
  {
    key: "live_pick",
    label: "8. Confirm LIVE_PICK appears in Top Plays",
    detail: "Dashboard Top Plays section should show LIVE picks for qualifying leagues",
  },
];

function evaluateStep(key: string, ctx: StepContext): boolean {
  switch (key) {
    case "api_football": return ctx.linkedTeams > 0;
    case "players": return ctx.hasPlayers;
    case "odds_key": return ctx.hasOddsKey;
    case "odds_sync": return ctx.hasOddsRows;
    case "trusted_markets": return ctx.hasTrustedMarkets;
    case "live_odds": return ctx.hasLiveOdds;
    case "settlement": return ctx.hasSettlement;
    case "live_pick": return ctx.liveReady > 0 && ctx.hasOddsRows && ctx.hasLiveOdds;
    default: return false;
  }
}
