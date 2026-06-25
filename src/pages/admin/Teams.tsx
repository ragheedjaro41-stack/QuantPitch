import { useState } from "react";
import { useAdminTeams } from "../../lib/adminHooks";
import { PageHeader, Spinner, ErrorState, TeamBadge } from "../../components/ui";
import { CircleCheck as CheckCircle, Circle as XCircle, ArrowUp, ArrowDown } from "lucide-react";

export default function AdminTeams() {
  const { data, isLoading, isError } = useAdminTeams();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "league" | "worldcup">("all");

  if (isLoading) return <Spinner />;
  if (isError || !data) return <ErrorState message="Failed to load teams" />;

  const filtered = data.filter((t: any) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.short_name.toLowerCase().includes(search.toLowerCase()) ||
      (t.country || "").toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || t.competition === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
      <PageHeader title="Team Registry" subtitle={`${data.length} teams registered`} />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search teams, country..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input flex-1"
        />
        <div className="flex gap-2">
          {(["all", "league", "worldcup"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${filter === f ? "bg-accent text-base-900" : "bg-base-700/50 text-slate-400 hover:text-white"}`}
            >
              {f === "all" ? "All" : f === "league" ? "League" : "World Cup"}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-base-700 bg-base-700/20">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Team</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Country</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Competition</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">City / Stadium</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">P/R</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Aliases</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t: any) => (
                <tr key={t.id} className="border-b border-base-700/30 last:border-0 hover:bg-base-700/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <TeamBadge short_name={t.short_name} color={t.primary_color} size="sm" />
                      <div>
                        <p className="text-sm font-semibold text-white">{t.name}</p>
                        <p className="text-xs text-slate-500">#{t.short_name} · Est. {t.founded}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{t.country || t.city}</td>
                  <td className="px-4 py-3">
                    <span className={`badge text-xs ${t.competition === "worldcup" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-accent/10 text-accent border-accent/30"}`}>
                      {t.competition === "worldcup" ? "World Cup" : "League"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-slate-400 truncate max-w-[180px]">{t.city}</p>
                    <p className="text-xs text-slate-600 truncate max-w-[180px]">{t.stadium}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {t.active !== false ? (
                      <CheckCircle size={14} className="text-good mx-auto" />
                    ) : (
                      <XCircle size={14} className="text-bad mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {t.promoted && <ArrowUp size={14} className="text-good mx-auto" />}
                    {t.relegated && <ArrowDown size={14} className="text-bad mx-auto" />}
                    {!t.promoted && !t.relegated && <span className="text-xs text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {t.aliases?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {t.aliases.map((a: any) => (
                          <span key={a.id} className="badge bg-base-700/60 text-slate-400 text-xs">{a.alias}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600">None</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
