import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  usePlayerSyncSummary,
  useApiFootballSyncCooldown,
} from "../../lib/adminHooks";
import { PageHeader, Spinner, StatCard } from "../../components/ui";
import {
  Users,
  RefreshCw,
  Loader as Loader2,
  CircleCheck as CheckCircle,
  CircleX as XCircle,
  CircleAlert as AlertCircle,
  Shield,
  ShieldAlert,
  Trophy,
  Target,
} from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function timeSince(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function statusColor(status: string): string {
  switch (status) {
    case "completed": return "#10B981";
    case "running": return "#f97316";
    case "failed": return "#f87171";
    default: return "#64748b";
  }
}

export default function PlayerSync() {
  const qc = useQueryClient();
  const { data: summary, isLoading } = usePlayerSyncSummary();
  const { data: cooldown } = useApiFootballSyncCooldown("players");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ ok: boolean; message: string; details?: Record<string, unknown> } | null>(null);

  if (isLoading) return <Spinner />;

  const cd = cooldown || { onCooldown: false, remaining: 0 };

  async function runSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/sync-players`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setSyncResult({ ok: false, message: json.error || `HTTP ${res.status}` });
      } else {
        setSyncResult({
          ok: true,
          message: `Synced ${json.synced} players across ${json.teams_processed} teams`,
          details: json,
        });
      }
    } catch (err) {
      setSyncResult({ ok: false, message: err instanceof Error ? err.message : "Network error" });
    } finally {
      setSyncing(false);
      qc.invalidateQueries({ queryKey: ["player-sync-summary"] });
      qc.invalidateQueries({ queryKey: ["api-football-cooldown", "players"] });
      qc.invalidateQueries({ queryKey: ["players"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    }
  }

  const s = summary;

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
      <PageHeader title="Player Sync" subtitle="API-Football player roster ingestion">
        <button
          onClick={runSync}
          disabled={syncing || cd.onCooldown}
          className="btn-primary flex items-center gap-2 disabled:opacity-40"
        >
          {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {syncing ? "Syncing..." : cd.onCooldown ? `Cooldown ${cd.remaining}s` : "Sync Players"}
        </button>
      </PageHeader>

      {/* Sync result banner */}
      {syncResult && (
        <div className={`rounded-xl p-4 mb-6 flex items-start gap-3 border ${
          syncResult.ok
            ? "bg-good/5 border-good/20"
            : "bg-bad/5 border-bad/20"
        }`}>
          {syncResult.ok ? <CheckCircle size={18} className="text-good shrink-0 mt-0.5" /> : <XCircle size={18} className="text-bad shrink-0 mt-0.5" />}
          <div>
            <p className={`text-sm font-medium ${syncResult.ok ? "text-good" : "text-bad"}`}>{syncResult.message}</p>
            {(() => {
              const mf = syncResult.details?.missing_fields as string[] | undefined;
              return mf && mf.length > 0 ? (
                <p className="text-xs text-slate-400 mt-1">
                  {"Provider missing fields: " + mf.join(", ")}
                </p>
              ) : null;
            })()}
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Real Players" value={s?.total_real_players ?? 0} icon={<Users size={18} />} accent="#00D4FF" />
        <StatCard label="Teams Done" value={`${s?.teams_completed ?? 0}/${s?.total_synced_teams ?? 0}`} icon={<Shield size={18} />} accent="#10B981" />
        <StatCard label="Demo Players" value={s?.total_demo_players ?? 0} icon={<ShieldAlert size={18} />} accent="#f97316" />
        <StatCard label="Duplicates" value={s?.duplicates ?? 0} icon={<AlertCircle size={18} />} accent={s?.duplicates ? "#f87171" : "#10B981"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Position breakdown */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Position Breakdown</h2>
          {s && s.total_real_players > 0 ? (
            <div className="space-y-3">
              {(["GK", "DEF", "MID", "FWD", "SUB"] as const).map((pos) => {
                const count = s.position_breakdown[pos];
                const pct = s.total_real_players > 0 ? Math.round((count / s.total_real_players) * 100) : 0;
                const colors: Record<string, string> = { GK: "#f59e0b", DEF: "#3b82f6", MID: "#10b981", FWD: "#ef4444", SUB: "#64748b" };
                return (
                  <div key={pos} className="flex items-center gap-3">
                    <span className="w-10 text-xs font-bold" style={{ color: colors[pos] }}>{pos}</span>
                    <div className="flex-1 h-2 rounded-full bg-base-700 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: colors[pos] }} />
                    </div>
                    <span className="text-xs text-slate-400 w-12 text-right">{count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">No players synced yet</p>
          )}
        </div>

        {/* Missing teams */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Missing Teams</h2>
          {s && s.teams_missing.length > 0 ? (
            <div className="space-y-2">
              {s.teams_missing.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-xl p-2.5 bg-base-700/30">
                  <AlertCircle size={14} className="text-warn shrink-0" />
                  <span className="text-sm text-white">{t.name}</span>
                  <span className="text-xs text-slate-500 ml-auto">ext: {t.external_id}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle size={28} className="text-good mx-auto mb-2" />
              <p className="text-sm text-slate-400">
                {(s?.total_real_players ?? 0) > 0 ? "All teams have players" : "Run sync to populate"}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top scorers */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={16} className="text-accent" />
            <h2 className="text-lg font-semibold text-white">Top Scorers (Synced)</h2>
          </div>
          {s && s.top_scorers.length > 0 ? (
            <div className="space-y-2">
              {s.top_scorers.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-base-700/30 transition-colors">
                  <span className="font-mono text-sm text-slate-500 w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.position} - {p.appearances} apps</p>
                  </div>
                  <span className="font-mono text-sm font-bold text-accent">{p.goals}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-6">No data yet</p>
          )}
        </div>

        {/* Top assists */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} className="text-good" />
            <h2 className="text-lg font-semibold text-white">Top Assists (Synced)</h2>
          </div>
          {s && s.top_assists.length > 0 ? (
            <div className="space-y-2">
              {s.top_assists.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-base-700/30 transition-colors">
                  <span className="font-mono text-sm text-slate-500 w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.position} - {p.appearances} apps</p>
                  </div>
                  <span className="font-mono text-sm font-bold text-good">{p.assists}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-6">No data yet</p>
          )}
        </div>
      </div>

      {/* Sync history */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Sync History</h2>
        {s && s.logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-base-700">
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">When</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-slate-500">Synced</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-slate-500">Errors</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Details</th>
                </tr>
              </thead>
              <tbody>
                {s.logs.map((log) => {
                  const details = log.meta as Record<string, unknown> | null;
                  return (
                    <tr key={log.id} className="border-b border-base-700/40">
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: statusColor(log.status) }}>
                          {log.status === "completed" ? <CheckCircle size={12} /> : log.status === "failed" ? <XCircle size={12} /> : <Loader2 size={12} className="animate-spin" />}
                          {log.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-400">{timeSince(log.started_at)}</td>
                      <td className="px-3 py-2.5 text-xs text-white text-right font-mono">{log.synced_count}</td>
                      <td className="px-3 py-2.5 text-xs text-right font-mono" style={{ color: log.error_count > 0 ? "#f87171" : "#64748b" }}>{log.error_count}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-500 max-w-xs truncate">
                        {log.error_message || (details ? `${(details as Record<string, unknown>).teams_processed ?? "?"} teams` : "-")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-8">No player syncs have been run yet</p>
        )}
      </div>

      {/* Safety note */}
      <div className="card p-4 mt-6 border border-warn/20 bg-warn/5">
        <div className="flex items-start gap-3">
          <AlertCircle size={16} className="text-warn shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warn">Three Laws</p>
            <ul className="text-xs text-slate-400 mt-1 space-y-1">
              <li>1. No fake players or fabricated statistics stored</li>
              <li>2. Players upserted by external_id for idempotent deduplication</li>
              <li>3. Demo teams never receive real player data</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
