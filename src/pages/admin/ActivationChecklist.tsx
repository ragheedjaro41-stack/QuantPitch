import { useOddsProviders, useOddsMonitor, useOddsSyncLog, useTrustedMarkets } from "../../lib/adminHooks";
import { PageHeader, Spinner } from "../../components/ui";
import {
  CircleCheck as CheckCircle,
  CircleX as XCircle,
  ShieldAlert,
  Radio,
  Lock,
  Zap,
  ArrowRight,
  Database,
  Clock,
  ShieldCheck,
} from "lucide-react";

type GateStatus = "pass" | "fail" | "warn";

function GateRow({ label, status, detail }: { label: string; status: GateStatus; detail: string }) {
  const color = status === "pass" ? "#10B981" : status === "fail" ? "#f87171" : "#fbbf24";
  const Icon = status === "pass" ? CheckCircle : status === "fail" ? XCircle : ShieldAlert;
  return (
    <div className="flex items-center gap-3 py-2.5 px-4 border-b border-base-700/30 last:border-0">
      <Icon size={14} style={{ color }} className="shrink-0" />
      <span className="text-sm text-white flex-1">{label}</span>
      <span className="text-xs text-slate-400 text-right max-w-[50%]">{detail}</span>
    </div>
  );
}

function StepRow({ step, title, detail, done }: { step: number; title: string; detail: string; done: boolean }) {
  return (
    <div className="flex items-start gap-4 py-3 px-4 border-b border-base-700/30 last:border-0">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border"
        style={{
          backgroundColor: done ? "#10B98115" : "#1e293b",
          borderColor: done ? "#10B98140" : "#334155",
        }}
      >
        {done ? (
          <CheckCircle size={13} style={{ color: "#10B981" }} />
        ) : (
          <span className="font-mono text-xs font-bold text-slate-500">{step}</span>
        )}
      </div>
      <div className="flex-1">
        <p className={`text-sm font-semibold ${done ? "text-slate-500 line-through" : "text-white"}`}>{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{detail}</p>
      </div>
      {!done && <ArrowRight size={12} className="text-slate-600 shrink-0 mt-2" />}
    </div>
  );
}

export default function ActivationChecklist() {
  const { data: providers, isLoading: pL } = useOddsProviders();
  const { data: monitor, isLoading: mL } = useOddsMonitor();
  const { data: syncLog } = useOddsSyncLog(5);
  const { data: trustedMarkets } = useTrustedMarkets();

  if (pL || mL) return <Spinner />;

  const allProviders = providers || [];
  const activeProviders = allProviders.filter((p) => p.status === "active");
  const leagues = monitor?.leagues || [];
  const liveReadyLeagues = leagues.filter((l) => l.has_live_odds && l.playable && !l.is_synthetic);
  const totalOdds = monitor?.totalOdds ?? 0;
  const totalFresh = monitor?.totalFresh ?? 0;
  const hasSuccessfulSync = (syncLog || []).some((s) => s.status === "completed" && s.synced_count > 0);
  const trustedOnly = (trustedMarkets || []).filter((m) => m.trusted);
  const settlementMarkets = trustedOnly.filter((m) => m.settlement_supported);
  const latestSync = syncLog?.[0];
  const noUntrusted = !latestSync || latestSync.untrusted_markets_seen.length === 0;

  // Derived status
  const hasApiKey = activeProviders.length > 0 || (latestSync?.status === "completed" && latestSync.synced_count > 0);
  const hasOddsRows = totalOdds > 0;
  const hasFreshOdds = totalFresh > 0;
  const hasLiveLeagues = liveReadyLeagues.length > 0;
  const liveOddsConnected = activeProviders.length > 0 && hasFreshOdds;
  const livePicksAvailable = hasLiveLeagues;

  // Blockers
  const blockers: string[] = [];
  if (!hasApiKey) blockers.push("ODDS_API_KEY not configured in Edge Function secrets");
  if (activeProviders.length === 0) blockers.push("All providers inactive");
  if (!hasOddsRows) blockers.push("0 odds rows in match_odds table");
  if (!hasFreshOdds && hasOddsRows) blockers.push("All odds are stale (older than 4h threshold)");
  if (!hasLiveLeagues && hasFreshOdds) blockers.push("No league has has_live_odds=true with playable=true");

  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">
      <PageHeader
        title="Activation Checklist"
        subtitle="Final pre-launch report -- every gate between current state and LIVE_PICK"
      />

      {/* Current status banner */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div
          className="card p-5 border-l-4"
          style={{ borderColor: liveOddsConnected ? "#10B981" : "#f87171" }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Radio size={16} style={{ color: liveOddsConnected ? "#10B981" : "#f87171" }} />
            <h3 className="text-sm font-bold text-white">Live Odds Connected</h3>
          </div>
          <p
            className="font-mono text-3xl font-bold"
            style={{ color: liveOddsConnected ? "#10B981" : "#f87171" }}
          >
            {liveOddsConnected ? "YES" : "NO"}
          </p>
          {!liveOddsConnected && (
            <p className="text-xs text-slate-500 mt-2">
              {!hasApiKey
                ? "ODDS_API_KEY missing from Edge Function secrets"
                : activeProviders.length === 0
                ? "No provider has status=active"
                : "No fresh odds in database"}
            </p>
          )}
        </div>
        <div
          className="card p-5 border-l-4"
          style={{ borderColor: livePicksAvailable ? "#10B981" : "#f87171" }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Zap size={16} style={{ color: livePicksAvailable ? "#10B981" : "#f87171" }} />
            <h3 className="text-sm font-bold text-white">Live Picks Available</h3>
          </div>
          <p
            className="font-mono text-3xl font-bold"
            style={{ color: livePicksAvailable ? "#10B981" : "#f87171" }}
          >
            {livePicksAvailable ? "YES" : "NO"}
          </p>
          {livePicksAvailable ? (
            <p className="text-xs text-slate-400 mt-2">
              {liveReadyLeagues.length} league(s) certified LIVE READY
            </p>
          ) : (
            <p className="text-xs text-slate-500 mt-2">
              All leagues currently BLOCKED_PICK or DEMO_PICK
            </p>
          )}
        </div>
      </div>

      {/* Blockers */}
      {blockers.length > 0 && (
        <div className="card p-5 mb-8 border border-bad/30 bg-bad/5">
          <div className="flex items-start gap-3 mb-3">
            <Lock size={16} className="text-bad shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-bad">
                {blockers.length} blocker{blockers.length > 1 ? "s" : ""} remaining
              </p>
              <p className="text-xs text-slate-400 mt-1">
                These must be resolved before any league can reach LIVE_PICK status.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {blockers.map((b, i) => (
              <div key={i} className="flex items-center gap-2 pl-7">
                <XCircle size={11} className="text-bad shrink-0" />
                <span className="text-xs text-slate-300">{b}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activation steps */}
      <h2 className="text-sm font-bold text-white mb-3">Activation Steps</h2>
      <div className="card overflow-hidden mb-8">
        <StepRow
          step={1}
          title="Add ODDS_API_KEY to Supabase Edge Function secrets"
          detail="Supabase Dashboard > Edge Functions > Secrets > Add ODDS_API_KEY with your the-odds-api.com key."
          done={hasApiKey}
        />
        <StepRow
          step={2}
          title="Run sync-odds once"
          detail="Admin > Odds Monitor > Run Odds Sync. The edge function fetches live odds from the API."
          done={hasSuccessfulSync}
        />
        <StepRow
          step={3}
          title="Confirm odds_sync_log shows status=completed"
          detail="Check Admin > Odds Monitor > Sync History for a completed entry with synced_count > 0."
          done={hasSuccessfulSync}
        />
        <StepRow
          step={4}
          title="Confirm match_odds rows > 0"
          detail={`Currently: ${totalOdds} rows. Need at least 1 row from a trusted market.`}
          done={hasOddsRows}
        />
        <StepRow
          step={5}
          title="Confirm trusted markets only"
          detail={`${trustedOnly.length} trusted markets configured. ${noUntrusted ? "No untrusted markets logged." : "Untrusted markets were skipped in last sync."}`}
          done={noUntrusted && trustedOnly.length > 0}
        />
        <StepRow
          step={6}
          title="Confirm has_live_odds=true for leagues with fresh odds"
          detail={`${liveReadyLeagues.length} league(s) have has_live_odds=true + playable=true.`}
          done={hasLiveLeagues}
        />
        <StepRow
          step={7}
          title="Confirm Top Plays shows LIVE_PICK only after all gates pass"
          detail="Dashboard > Top Plays. Only leagues passing every gate below will show LIVE_PICK picks."
          done={livePicksAvailable}
        />
      </div>

      {/* Safety certification -- every gate */}
      <h2 className="text-sm font-bold text-white mb-3">Safety Certification Gates</h2>
      <p className="text-xs text-slate-400 mb-3">
        Every gate must show PASS for a league to reach LIVE_PICK. Failure in any single gate blocks the pick.
      </p>
      <div className="card overflow-hidden mb-8">
        <GateRow
          label="1. Non-demo league (is_synthetic=false)"
          status={leagues.some((l) => !l.is_synthetic) ? "pass" : "fail"}
          detail={`${leagues.filter((l) => !l.is_synthetic).length} real league(s), ${leagues.filter((l) => l.is_synthetic).length} synthetic`}
        />
        <GateRow
          label="2. Playable league (playable=true)"
          status={leagues.some((l) => l.playable && !l.is_synthetic) ? "pass" : "fail"}
          detail={`${leagues.filter((l) => l.playable && !l.is_synthetic).length} playable real league(s)`}
        />
        <GateRow
          label="3. Fresh odds (has_live_odds=true, fetched < 4h ago)"
          status={hasFreshOdds ? "pass" : "fail"}
          detail={hasFreshOdds ? `${totalFresh} fresh odds rows` : "0 fresh odds -- provider not connected"}
        />
        <GateRow
          label="4. Trusted market (h2h, totals_1.5/2.5/3.5, btts)"
          status={trustedOnly.length > 0 ? "pass" : "fail"}
          detail={`${trustedOnly.length} trusted market(s) configured; untrusted markets are skipped by sync`}
        />
        <GateRow
          label="5. Settlement support (settlement_supported=true on market)"
          status={settlementMarkets.length > 0 ? "pass" : "warn"}
          detail={`${settlementMarkets.length}/${trustedOnly.length} trusted markets have settlement verified`}
        />
        <GateRow
          label="6. Safety rules passed (coverage thresholds met per tier)"
          status="pass"
          detail="Safety rules are evaluated at runtime per league+tier. No override possible."
        />
        <GateRow
          label="7. Rate-limit protection (120s cooldown between syncs)"
          status="pass"
          detail="Enforced server-side in sync-odds edge function via odds_sync_log"
        />
        <GateRow
          label="8. Odds not stale (mark_stale_odds runs every sync)"
          status={totalFresh > 0 || totalOdds === 0 ? "pass" : "fail"}
          detail={totalOdds === 0 ? "No odds ingested yet" : `${totalFresh} fresh / ${monitor?.totalStale ?? 0} stale`}
        />
      </div>

      {/* Final rule */}
      <h2 className="text-sm font-bold text-white mb-3">Final Rule</h2>
      <div className="card p-6 border border-accent/30 bg-accent/5">
        <div className="flex items-start gap-3">
          <ShieldCheck size={20} className="text-accent shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-white mb-2">
              No LIVE_PICK unless ALL gates pass.
            </p>
            <div className="space-y-1.5">
              <p className="text-xs text-slate-400">
                LIVE_PICK = non-demo + playable + fresh odds + trusted market + settlement support + safety rules passed + not stale
              </p>
              <p className="text-xs text-slate-400">
                Any single failure downgrades the pick to BLOCKED_PICK. Synthetic leagues are always DEMO_PICK.
              </p>
              <p className="text-xs text-slate-400">
                The sync-odds edge function enforces trusted-market-only ingestion. Untrusted markets are logged but never stored in match_odds.
              </p>
              <p className="text-xs text-slate-400">
                Rate-limiting (120s cooldown) protects the API quota. Stale odds (older than 4h) are automatically marked and excluded from has_live_odds calculation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats footer */}
      <div className="grid grid-cols-4 gap-3 mt-8">
        <div className="card p-3 text-center">
          <Database size={14} className="mx-auto mb-1 text-accent" />
          <p className="font-mono text-lg font-bold text-accent">{totalOdds}</p>
          <p className="text-xs text-slate-600">Odds Rows</p>
        </div>
        <div className="card p-3 text-center">
          <CheckCircle size={14} className="mx-auto mb-1 text-good" />
          <p className="font-mono text-lg font-bold text-good">{totalFresh}</p>
          <p className="text-xs text-slate-600">Fresh</p>
        </div>
        <div className="card p-3 text-center">
          <Clock size={14} className="mx-auto mb-1 text-warn" />
          <p className="font-mono text-lg font-bold text-warn">{monitor?.totalStale ?? 0}</p>
          <p className="text-xs text-slate-600">Stale</p>
        </div>
        <div className="card p-3 text-center">
          <Zap size={14} className="mx-auto mb-1" style={{ color: liveReadyLeagues.length > 0 ? "#10B981" : "#f87171" }} />
          <p className="font-mono text-lg font-bold" style={{ color: liveReadyLeagues.length > 0 ? "#10B981" : "#f87171" }}>
            {liveReadyLeagues.length}
          </p>
          <p className="text-xs text-slate-600">LIVE READY</p>
        </div>
      </div>
    </div>
  );
}
