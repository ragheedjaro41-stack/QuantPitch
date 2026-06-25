import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMatches } from "../lib/hooks";
import { PageHeader, Spinner, ErrorState, TeamBadge, EmptyState } from "../components/ui";
import { formatDate, formatTime } from "../lib/utils";

export default function Matches() {
  const { data, isLoading, isError } = useMatches();
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "scheduled">("all");

  const rounds = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.map((m) => m.round));
    return [...set].sort((a, b) => a - b);
  }, [data]);

  const activeRound = useMemo(() => {
    if (selectedRound !== null) return selectedRound;
    if (!data || data.length === 0) return 1;
    const now = new Date();
    const upcoming = data.filter((m) => new Date(m.match_date) >= now);
    if (upcoming.length > 0) return upcoming[upcoming.length - 1].round;
    return rounds[rounds.length - 1] ?? 1;
  }, [selectedRound, data, rounds]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data
      .filter((m) => m.round === activeRound)
      .filter((m) => statusFilter === "all" || m.status === statusFilter)
      .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
  }, [data, activeRound, statusFilter]);

  if (isLoading) return <Spinner />;
  if (isError || !data) return <ErrorState message="Failed to load matches" />;

  const canPrev = rounds.indexOf(activeRound) > 0;
  const canNext = rounds.indexOf(activeRound) < rounds.length - 1;

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
      <PageHeader title="Matches" subtitle={`${data.length} matches this season`} />

      {/* Round navigator */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const idx = rounds.indexOf(activeRound);
              if (idx > 0) setSelectedRound(rounds[idx - 1]);
            }}
            disabled={!canPrev}
            className="p-2 rounded-lg bg-base-700/50 text-slate-400 hover:text-white hover:bg-base-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={18} />
          </button>

          <select
            value={activeRound}
            onChange={(e) => setSelectedRound(Number(e.target.value))}
            className="input px-4 py-2.5 min-w-[140px] text-center font-semibold"
          >
            {rounds.map((r) => (
              <option key={r} value={r}>Matchday {r}</option>
            ))}
          </select>

          <button
            onClick={() => {
              const idx = rounds.indexOf(activeRound);
              if (idx < rounds.length - 1) setSelectedRound(rounds[idx + 1]);
            }}
            disabled={!canNext}
            className="p-2 rounded-lg bg-base-700/50 text-slate-400 hover:text-white hover:bg-base-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex gap-2">
          {(["all", "completed", "scheduled"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                statusFilter === s
                  ? "bg-accent text-base-900"
                  : "bg-base-700/50 text-slate-400 hover:text-white"
              }`}
            >
              {s === "all" ? "All" : s === "completed" ? "FT" : "Upcoming"}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-slate-500">
          {filtered.length} match{filtered.length !== 1 ? "es" : ""}
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No matches for this matchday" />
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <Link
              key={m.id}
              to={`/matches/${m.id}`}
              className="card card-hover p-4 flex items-center gap-4 group"
            >
              <div className="hidden sm:flex flex-col items-center w-20 shrink-0">
                <span className="text-xs text-slate-500">{formatDate(m.match_date)}</span>
                <span className="text-xs text-slate-600 mt-0.5">{formatTime(m.match_date)}</span>
              </div>

              <div className="flex-1 flex items-center justify-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-2.5 flex-1 justify-end">
                  <span className="text-xs sm:text-sm font-medium text-white group-hover:text-accent transition-colors text-right truncate">
                    {m.home_team?.name}
                  </span>
                  <TeamBadge short_name={m.home_team?.short_name || "?"} color={m.home_team?.primary_color || "#666"} size="sm" logo_url={m.home_team?.logo_url} />
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-base-700/60 shrink-0">
                  {m.status === "completed" ? (
                    <>
                      <span className="font-mono text-base sm:text-lg font-bold text-white">{m.home_score}</span>
                      <span className="text-slate-500 text-sm">-</span>
                      <span className="font-mono text-base sm:text-lg font-bold text-white">{m.away_score}</span>
                    </>
                  ) : (
                    <span className="text-xs font-semibold text-slate-400 px-1">vs</span>
                  )}
                </div>

                <div className="flex items-center gap-2 sm:gap-2.5 flex-1">
                  <TeamBadge short_name={m.away_team?.short_name || "?"} color={m.away_team?.primary_color || "#666"} size="sm" logo_url={m.away_team?.logo_url} />
                  <span className="text-xs sm:text-sm font-medium text-white group-hover:text-accent transition-colors truncate">
                    {m.away_team?.name}
                  </span>
                </div>
              </div>

              <div className="hidden md:block w-36 text-right shrink-0">
                <p className="text-xs text-slate-500 truncate">{m.venue}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
