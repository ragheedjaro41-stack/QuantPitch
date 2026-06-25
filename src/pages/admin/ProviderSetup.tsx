import { useOddsProviders } from "../../lib/adminHooks";
import { PageHeader, Spinner } from "../../components/ui";
import {
  Radio,
  CircleCheck as CheckCircle,
  CircleX as XCircle,
  Key,
  Server,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

const REQUIRED_SECRETS = [
  {
    name: "API_FOOTBALL_KEY",
    description: "API key for API-Football. Required for fetching match fixtures, results, and stats. Powers the sync-results edge function and settlement engine.",
    role: "results",
  },
  {
    name: "ODDS_API_KEY",
    description: "API key for The Odds API (the-odds-api.com). Required for live bookmaker odds sync. Powers the sync-odds edge function.",
    role: "odds",
    provider: "the-odds-api",
  },
];

const SETUP_STEPS = [
  {
    step: 1,
    title: "Get an API key",
    detail: "Sign up at the-odds-api.com and copy your API key from the dashboard.",
  },
  {
    step: 2,
    title: "Add secret to Supabase",
    detail: 'Go to Supabase Dashboard > Edge Functions > Secrets. Add ODDS_API_KEY with your key value.',
  },
  {
    step: 3,
    title: "Run odds sync",
    detail: 'Go to Admin > Odds Monitor and click "Run Odds Sync". The edge function will fetch live odds from the API.',
  },
  {
    step: 4,
    title: "Verify league status",
    detail: "After sync completes, leagues with fresh odds will show has_live_odds=true. Check Admin > Certification to confirm LIVE READY status.",
  },
];

export default function ProviderSetup() {
  const { data: providers, isLoading } = useOddsProviders();

  if (isLoading) return <Spinner />;

  const allProviders = providers || [];
  const theOddsApi = allProviders.find((p) => p.slug === "the-odds-api");

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-5xl mx-auto">
      <PageHeader
        title="Provider Setup"
        subtitle="Configure odds provider credentials to activate LIVE_PICK"
      />

      {/* Safety warning */}
      <div className="card p-5 mb-6 border border-warn/30 bg-warn/5">
        <div className="flex items-start gap-3">
          <ShieldAlert size={16} className="text-warn shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-bold text-warn">Provider Key Roles</p>
            <p className="text-xs text-slate-300">
              <strong className="text-white">API_FOOTBALL_KEY</strong> = Fixtures, results, and stats provider.
              Required for sync-results and the settlement engine. Without it, no match results are fetched and no markets are settled.
            </p>
            <p className="text-xs text-slate-300">
              <strong className="text-white">ODDS_API_KEY</strong> = Bookmaker odds provider.
              Required for sync-odds and live odds. Without it, no league gets has_live_odds=true.
              LIVE_PICK remains blocked until this key exists.
            </p>
            <p className="text-xs text-slate-400">
              Both keys are read from secrets at runtime only. They are never hardcoded, never exposed in the frontend, and never printed in logs.
            </p>
          </div>
        </div>
      </div>

      {/* Required secrets */}
      <h2 className="text-sm font-bold text-white mb-3">Required Secrets</h2>
      <div className="space-y-3 mb-8">
        {REQUIRED_SECRETS.map((secret) => {
          const provider = secret.provider ? allProviders.find((p) => p.slug === secret.provider) : null;
          const isConfigured = provider ? provider.status === "active" && !!provider.last_success_at : false;
          return (
            <div key={secret.name} className="card p-4">
              <div className="flex items-center gap-3 mb-2">
                <Key size={14} className={isConfigured ? "text-good" : "text-slate-500"} />
                <code className="text-sm font-bold text-white bg-base-700/60 px-2 py-0.5 rounded">
                  {secret.name}
                </code>
                <span className="text-xs text-slate-500 bg-base-700/40 px-1.5 py-0.5 rounded">
                  {secret.role === "results" ? "Results / Settlement" : "Odds / LIVE_PICK"}
                </span>
                {secret.provider && (isConfigured ? (
                  <span className="inline-flex items-center gap-1 text-xs text-good font-semibold">
                    <CheckCircle size={11} /> Configured & working
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-bad font-semibold">
                    <XCircle size={11} /> Not configured
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-400">{secret.description}</p>
            </div>
          );
        })}
      </div>

      {/* Provider status */}
      <h2 className="text-sm font-bold text-white mb-3">Provider Status</h2>
      <div className="card overflow-hidden mb-8">
        <table className="w-full">
          <thead>
            <tr className="border-b border-base-700/60 bg-base-700/20">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Provider</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-24">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-32">Last Ping</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-32">Last Success</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Notes</th>
            </tr>
          </thead>
          <tbody>
            {allProviders.map((p) => {
              const statusColor =
                p.status === "active" ? "#10B981" :
                p.status === "error" ? "#f87171" :
                p.status === "stale" ? "#fbbf24" : "#64748b";
              return (
                <tr key={p.id} className="border-b border-base-700/30 last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Radio size={12} style={{ color: statusColor }} />
                      <span className="text-sm text-white">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-bold" style={{ color: statusColor }}>
                      {p.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-slate-400">
                      {p.last_ping_at ? new Date(p.last_ping_at).toLocaleString() : "Never"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-slate-400">
                      {p.last_success_at ? new Date(p.last_success_at).toLocaleString() : "Never"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-slate-500">{p.notes || "--"}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Setup steps */}
      <h2 className="text-sm font-bold text-white mb-3">How to Activate LIVE_PICK</h2>
      <div className="space-y-3 mb-8">
        {SETUP_STEPS.map((s) => (
          <div key={s.step} className="card p-4 flex items-start gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 border border-accent/30">
              <span className="font-mono text-sm font-bold text-accent">{s.step}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{s.title}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.detail}</p>
            </div>
            {s.step < SETUP_STEPS.length && (
              <ArrowRight size={14} className="text-slate-600 shrink-0 ml-auto mt-2" />
            )}
          </div>
        ))}
      </div>

      {/* The Odds API details */}
      <h2 className="text-sm font-bold text-white mb-3">Current Provider: The Odds API</h2>
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-3">
          <Server size={14} className="text-accent" />
          <p className="text-sm font-semibold text-white">the-odds-api.com</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Edge Function</p>
            <code className="text-xs text-accent bg-base-700/60 px-2 py-1 rounded">sync-odds</code>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Required Secret</p>
            <code className="text-xs text-accent bg-base-700/60 px-2 py-1 rounded">ODDS_API_KEY</code>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Default Sport Key</p>
            <code className="text-xs text-slate-400 bg-base-700/60 px-2 py-1 rounded">soccer_epl</code>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Markets</p>
            <code className="text-xs text-slate-400 bg-base-700/60 px-2 py-1 rounded">h2h (1X2)</code>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Stale Threshold</p>
            <code className="text-xs text-slate-400 bg-base-700/60 px-2 py-1 rounded">4 hours</code>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Status</p>
            <span
              className="text-xs font-bold"
              style={{ color: theOddsApi?.status === "active" ? "#10B981" : "#64748b" }}
            >
              {theOddsApi?.status.toUpperCase() ?? "UNKNOWN"}
            </span>
          </div>
        </div>
        <div className="mt-4 p-3 rounded-xl bg-base-700/20 border border-base-600/30">
          <p className="text-xs text-slate-400">
            The sync-odds edge function checks for ODDS_API_KEY at runtime. If the secret is missing,
            it returns a clear error and does NOT modify has_live_odds on any league. Only fresh odds
            inserted within the last 4 hours can set has_live_odds=true via sync_league_live_odds_flag().
          </p>
        </div>
      </div>
    </div>
  );
}
