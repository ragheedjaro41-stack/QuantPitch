import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, Spinner, ErrorState } from "../../components/ui";
import { CircleCheck as CheckCircle, CircleX as XCircle, CircleAlert as AlertCircle, Search } from "lucide-react";
import { getUnresolvedAliases, acceptAlias, rejectAlias } from "../../lib/aliasResolver";
import { supabase } from "../../lib/supabase";

function ConfidenceBadge({ score }: { score: number }) {
  const color = score >= 80 ? "#10B981" : score >= 50 ? "#fbbf24" : "#f87171";
  return (
    <span className="font-mono text-xs font-bold" style={{ color }}>
      {score}%
    </span>
  );
}

export default function AliasQueue() {
  const [searchTeam, setSearchTeam] = useState("");
  const qc = useQueryClient();

  const { data: queue, isLoading, isError } = useQuery({
    queryKey: ["unresolved-aliases"],
    queryFn: getUnresolvedAliases,
  });

  const { data: teams } = useQuery({
    queryKey: ["all-teams-for-alias"],
    queryFn: async () => {
      const { data } = await supabase.from("teams").select("id, name, short_name").order("name");
      return data || [];
    },
  });

  const acceptMut = useMutation({
    mutationFn: ({ queueId, teamId, rawName, source }: { queueId: string; teamId: string; rawName: string; source: string }) =>
      acceptAlias(queueId, teamId, rawName, source),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["unresolved-aliases"] }),
  });

  const rejectMut = useMutation({
    mutationFn: (queueId: string) => rejectAlias(queueId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["unresolved-aliases"] }),
  });

  const filteredTeams = (teams || []).filter((t) =>
    t.name.toLowerCase().includes(searchTeam.toLowerCase()) ||
    t.short_name.toLowerCase().includes(searchTeam.toLowerCase())
  );

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <PageHeader
        title="Alias Review Queue"
        subtitle="Unresolved provider team names awaiting canonical ID assignment"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Pending", value: (queue || []).length, color: "#fbbf24" },
          { label: "High Confidence (≥80%)", value: (queue || []).filter((q) => q.confidence >= 80).length, color: "#10B981" },
          { label: "Low Confidence (<50%)", value: (queue || []).filter((q) => q.confidence < 50).length, color: "#f87171" },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">{s.label}</p>
            <p className="font-mono text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <ErrorState message="Failed to load alias queue" />
      ) : !queue || queue.length === 0 ? (
        <div className="card p-10 text-center">
          <CheckCircle size={32} className="text-good mx-auto mb-2" />
          <p className="text-sm font-medium text-white">Alias queue is empty</p>
          <p className="text-xs text-slate-500 mt-1">All provider names have been resolved or are awaiting new ingestion</p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((item) => {
            const [selectedTeam, setSelectedTeam] = useState(item.suggested_team_id ?? "");
            return (
              <div key={item.id} className="card p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="text-base font-semibold text-white">{item.raw_name}</p>
                      <span className="text-xs text-slate-500 bg-base-700/60 px-2 py-0.5 rounded">{item.source}</span>
                    </div>

                    {item.suggested_team_name && (
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle size={12} className="text-accent" />
                        <p className="text-xs text-slate-400">
                          Best suggestion: <span className="text-white font-medium">{item.suggested_team_name}</span>
                          {" · "}
                          <ConfidenceBadge score={item.confidence} />
                        </p>
                      </div>
                    )}

                    {/* Team selector */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 max-w-xs">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Search teams..."
                          value={searchTeam}
                          onChange={(e) => setSearchTeam(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 text-xs bg-base-700/50 border border-base-600/40 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-accent/50"
                        />
                      </div>
                      <select
                        value={selectedTeam}
                        onChange={(e) => setSelectedTeam(e.target.value)}
                        className="flex-1 max-w-xs py-2 px-3 text-xs bg-base-700/50 border border-base-600/40 rounded-lg text-white focus:outline-none focus:border-accent/50"
                      >
                        <option value="">— select canonical team —</option>
                        {filteredTeams.map((t) => (
                          <option key={t.id} value={t.id}>{t.name} ({t.short_name})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => selectedTeam && acceptMut.mutate({
                        queueId: item.id,
                        teamId: selectedTeam,
                        rawName: item.raw_name,
                        source: item.source,
                      })}
                      disabled={!selectedTeam || acceptMut.isPending}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-good/10 text-good border border-good/20 text-xs font-semibold hover:bg-good/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <CheckCircle size={13} /> Accept
                    </button>
                    <button
                      onClick={() => rejectMut.mutate(item.id)}
                      disabled={rejectMut.isPending}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bad/10 text-bad border border-bad/20 text-xs font-semibold hover:bg-bad/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <XCircle size={13} /> Reject
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-3">Queued {new Date(item.created_at).toLocaleDateString()}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
