import { useAutomationStatus, type SyncJobStatus } from "../../lib/adminHooks";
import { PageHeader, Spinner } from "../../components/ui";
import {
  Clock,
  CircleCheck as CheckCircle,
  CircleX as XCircle,
  CircleAlert as AlertCircle,
  Timer,
  CalendarClock,
  Key,
  Zap,
  ShieldCheck,
  Radio,
  Info,
} from "lucide-react";

function timeSince(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function statusConfig(status: string | null) {
  switch (status) {
    case "completed":
      return { color: "#10B981", bg: "#10B98112", label: "COMPLETED", Icon: CheckCircle };
    case "running":
      return { color: "#00D4FF", bg: "#00D4FF12", label: "RUNNING", Icon: Clock };
    case "failed":
    case "error":
      return { color: "#f87171", bg: "#f8717112", label: "FAILED", Icon: XCircle };
    default:
      return { color: "#64748b", bg: "#64748b12", label: status?.toUpperCase() || "NEVER RUN", Icon: AlertCircle };
  }
}

function JobCard({ job }: { job: SyncJobStatus }) {
  const sc = statusConfig(job.lastStatus);
  const hasKey = job.hasApiKey === true;
  const errorRate = job.totalRuns > 0 ? Math.round((job.totalErrors / job.totalRuns) * 100) : 0;
  const isHealthy = job.lastStatus === "completed" && job.totalErrors === 0;
  const hasWarning = job.totalErrors > 0 && job.lastStatus === "completed";
  const isFailing = job.lastStatus === "failed" || job.lastStatus === "error";

  return (
    <div
      className="card p-0 overflow-hidden transition-all"
      style={{ borderColor: isFailing ? "#f8717130" : hasWarning ? "#fbbf2430" : "#1e293b" }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-base-700/40">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">{job.name}</h3>
              {hasKey ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-good" style={{ backgroundColor: "#10B98112", border: "1px solid #10B98130" }}>
                  KEY SET
                </span>
              ) : (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-slate-500" style={{ backgroundColor: "#64748b12", border: "1px solid #64748b30" }}>
                  NO KEY
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{job.description}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <sc.Icon size={12} style={{ color: sc.color }} />
            <span className="text-[10px] font-bold" style={{ color: sc.color }}>{sc.label}</span>
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 divide-x divide-base-700/30">
        <div className="px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock size={10} className="text-slate-600" />
            <span className="text-[10px] text-slate-600 uppercase tracking-wider">Last Run</span>
          </div>
          <p className="text-sm font-mono text-white">
            {job.lastRun ? timeSince(job.lastRun) : "--"}
          </p>
        </div>
        <div className="px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap size={10} className="text-slate-600" />
            <span className="text-[10px] text-slate-600 uppercase tracking-wider">Synced</span>
          </div>
          <p className="text-sm font-mono font-bold text-white">{job.lastSyncedCount}</p>
        </div>
        <div className="px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <XCircle size={10} className="text-slate-600" />
            <span className="text-[10px] text-slate-600 uppercase tracking-wider">Errors</span>
          </div>
          <p
            className="text-sm font-mono font-bold"
            style={{ color: job.totalErrors > 0 ? "#f87171" : "#10B981" }}
          >
            {job.totalErrors}/{job.totalRuns}
            {job.totalRuns > 0 && (
              <span className="text-[10px] text-slate-500 ml-1">({errorRate}%)</span>
            )}
          </p>
        </div>
      </div>

      {/* Cron / cooldown / last error */}
      <div className="border-t border-base-700/30 px-5 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock size={12} className="text-accent" />
            <span className="text-xs text-slate-400">Recommended:</span>
            <code className="text-[10px] text-accent bg-base-700/60 px-1.5 py-0.5 rounded font-mono">{job.recommendedCron}</code>
            <span className="text-[10px] text-slate-600">({job.recommendedInterval})</span>
          </div>
          {job.onCooldown && (
            <div className="flex items-center gap-1.5">
              <Timer size={11} className="text-warn" />
              <span className="text-[10px] text-warn font-bold">Cooldown {job.cooldownRemaining}s</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Key size={12} className="text-slate-600" />
          <span className="text-xs text-slate-500">Requires:</span>
          <code className="text-[10px] text-slate-400 bg-base-700/60 px-1.5 py-0.5 rounded font-mono">{job.apiKeyName}</code>
        </div>

        <div className="flex items-center gap-2">
          <Radio size={12} className="text-slate-600" />
          <span className="text-xs text-slate-500">Edge function:</span>
          <code className="text-[10px] text-slate-400 bg-base-700/60 px-1.5 py-0.5 rounded font-mono">{job.edgeFunction}</code>
        </div>

        {/* Health indicator */}
        <div className="flex items-center gap-2 pt-1">
          {isHealthy ? (
            <>
              <ShieldCheck size={12} className="text-good" />
              <span className="text-[10px] text-good font-semibold">Healthy -- ready for automation</span>
            </>
          ) : hasWarning ? (
            <>
              <AlertCircle size={12} className="text-warn" />
              <span className="text-[10px] text-warn font-semibold">Some errors detected -- review before automating</span>
            </>
          ) : isFailing ? (
            <>
              <XCircle size={12} className="text-bad" />
              <span className="text-[10px] text-bad font-semibold">Last run failed -- fix before automating</span>
            </>
          ) : (
            <>
              <AlertCircle size={12} className="text-slate-500" />
              <span className="text-[10px] text-slate-500 font-semibold">Never run -- execute manually first</span>
            </>
          )}
        </div>
      </div>

      {/* Last error */}
      {job.lastError && (
        <div className="border-t border-bad/20 px-5 py-2.5 bg-bad/5">
          <p className="text-[10px] text-bad break-all line-clamp-2">{job.lastError}</p>
        </div>
      )}
    </div>
  );
}

export default function Automation() {
  const { data, isLoading } = useAutomationStatus();

  if (isLoading) return <Spinner />;

  const jobs = data?.jobs || [];
  const readyCount = jobs.filter((j) => j.lastStatus === "completed" && j.hasApiKey).length;
  const failCount = jobs.filter((j) => j.lastStatus === "failed" || j.lastStatus === "error").length;
  const neverRun = jobs.filter((j) => !j.lastRun).length;
  const withKey = jobs.filter((j) => j.hasApiKey).length;

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <PageHeader
        title="Automation"
        subtitle="Scheduled sync readiness, cron configuration, and health monitoring"
      />

      {/* Status note */}
      <div className="card p-4 mb-6 border border-accent/20 bg-accent/5">
        <div className="flex gap-3">
          <Info size={16} className="text-accent shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-slate-200 leading-relaxed">
              This page shows which sync jobs are ready for cron automation. External cron scheduling is not enabled
              until you explicitly configure it. Run each sync manually at least once to validate before automating.
            </p>
          </div>
        </div>
      </div>

      {/* Readiness summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="card p-4 text-center">
          <CheckCircle size={16} className="mx-auto mb-1.5 text-good" />
          <p className="font-mono text-2xl font-bold text-good">{readyCount}</p>
          <p className="text-xs text-slate-500 mt-0.5">Ready to Automate</p>
        </div>
        <div className="card p-4 text-center">
          <XCircle size={16} className="mx-auto mb-1.5 text-bad" />
          <p className="font-mono text-2xl font-bold text-bad">{failCount}</p>
          <p className="text-xs text-slate-500 mt-0.5">Failing</p>
        </div>
        <div className="card p-4 text-center">
          <AlertCircle size={16} className="mx-auto mb-1.5 text-slate-400" />
          <p className="font-mono text-2xl font-bold text-white">{neverRun}</p>
          <p className="text-xs text-slate-500 mt-0.5">Never Run</p>
        </div>
        <div className="card p-4 text-center">
          <Key size={16} className="mx-auto mb-1.5 text-accent" />
          <p className="font-mono text-2xl font-bold text-accent">{withKey}/{jobs.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">API Keys Set</p>
        </div>
      </div>

      {/* Job cards */}
      <h2 className="text-sm font-bold text-white mb-3">Sync Jobs</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {jobs.map((job) => (
          <JobCard key={job.slug} job={job} />
        ))}
      </div>

      {/* Cron reference table */}
      <h2 className="text-sm font-bold text-white mb-3">Recommended Cron Schedule</h2>
      <div className="card overflow-hidden mb-8">
        <table className="w-full">
          <thead>
            <tr className="border-b border-base-700/60 bg-base-700/20">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Job</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-40">Cron Expression</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-40">Interval</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-28">Cooldown</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-32">Key Required</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-24">Status</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
              const sc = statusConfig(job.lastStatus);
              return (
                <tr key={job.slug} className="border-b border-base-700/30 last:border-0">
                  <td className="px-4 py-2.5">
                    <span className="text-sm text-white font-semibold">{job.name}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <code className="text-xs text-accent bg-base-700/60 px-1.5 py-0.5 rounded font-mono">{job.recommendedCron}</code>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-slate-400">{job.recommendedInterval}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-slate-400 font-mono">{job.cooldownSeconds}s</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <code className="text-[10px] text-slate-400 bg-base-700/60 px-1.5 py-0.5 rounded font-mono">{job.apiKeyName}</code>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-bold" style={{ color: sc.color }}>{sc.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Setup instructions */}
      <h2 className="text-sm font-bold text-white mb-3">How to Enable Automation</h2>
      <div className="card p-5 border border-accent/20 bg-accent/5">
        <div className="flex items-start gap-3">
          <CalendarClock size={18} className="text-accent shrink-0 mt-0.5" />
          <div className="space-y-3">
            <div>
              <p className="text-xs text-white font-semibold mb-1">1. Validate manually</p>
              <p className="text-xs text-slate-400">
                Run each sync job from its admin page (API-Football, Settlement, Odds Monitor) at least once.
                Verify the results are correct and no errors occur.
              </p>
            </div>
            <div>
              <p className="text-xs text-white font-semibold mb-1">2. Ensure API keys are set</p>
              <p className="text-xs text-slate-400">
                API-Football syncs need <code className="text-accent">API_FOOTBALL_KEY</code>. Odds sync needs <code className="text-accent">ODDS_API_KEY</code>.
                Set them in Supabase Dashboard, Edge Functions, Secrets, or in the app_config table.
              </p>
            </div>
            <div>
              <p className="text-xs text-white font-semibold mb-1">3. Configure cron (external)</p>
              <p className="text-xs text-slate-400">
                Use an external scheduler (Supabase pg_cron, GitHub Actions, Vercel Cron, or any HTTP cron service) to POST to each
                edge function URL on the recommended schedule. Respect the 120s cooldown between calls.
              </p>
            </div>
            <div>
              <p className="text-xs text-white font-semibold mb-1">4. Monitor</p>
              <p className="text-xs text-slate-400">
                Return to this page to check health status, error rates, and last-run timestamps. Each job tracks its own sync log
                so failures are visible immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
