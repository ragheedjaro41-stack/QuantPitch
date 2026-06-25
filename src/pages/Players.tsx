import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, SlidersHorizontal, ChevronDown } from "lucide-react";
import { usePlayers } from "../lib/hooks";
import { PageHeader, Spinner, ErrorState, TeamBadge, EmptyState } from "../components/ui";
import { positionColor, positionLabel, ratingColor } from "../lib/utils";
import type { PlayerWithTeam } from "../types";

type SortKey = "rating" | "goals" | "assists" | "appearances" | "minutes_played" | "name";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "rating", label: "Rating" },
  { key: "goals", label: "Goals" },
  { key: "assists", label: "Assists" },
  { key: "appearances", label: "Apps" },
  { key: "minutes_played", label: "Minutes" },
  { key: "name", label: "Name" },
];

const POSITIONS = ["ALL", "GK", "DEF", "MID", "FWD"] as const;

export default function Players() {
  const { data, isLoading, isError } = usePlayers();
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState<string>("ALL");
  const [teamFilter, setTeamFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("rating");
  const [showFilters, setShowFilters] = useState(false);

  const teams = useMemo(() => {
    if (!data) return [];
    const seen = new Map<string, { id: string; name: string; short_name: string }>();
    for (const p of data) {
      if (p.team && !seen.has(p.team.id)) {
        seen.set(p.team.id, { id: p.team.id, name: p.team.name, short_name: p.team.short_name });
      }
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (posFilter !== "ALL" && p.position !== posFilter) return false;
      if (teamFilter !== "ALL" && p.team?.id !== teamFilter) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      const av = a[sortBy] ?? 0;
      const bv = b[sortBy] ?? 0;
      return (bv as number) - (av as number);
    });

    return list;
  }, [data, search, posFilter, teamFilter, sortBy]);

  if (isLoading) return <Spinner />;
  if (isError || !data) return <ErrorState message="Failed to load players" />;

  const realCount = data.filter((p) => p.external_id).length;

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
      <PageHeader
        title="Players"
        subtitle={realCount > 0 ? `${realCount} Premier League players` : "Player data syncing soon"}
      />

      {/* Search and filter controls */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              showFilters ? "bg-accent/10 text-accent border border-accent/20" : "bg-base-700/50 text-slate-400 hover:text-white"
            }`}
          >
            <SlidersHorizontal size={16} />
            <span className="hidden sm:inline">Filters</span>
          </button>
        </div>

        {/* Position pills -- always visible */}
        <div className="flex gap-2 flex-wrap">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              onClick={() => setPosFilter(pos)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                posFilter === pos
                  ? "bg-accent text-base-900 shadow-sm shadow-accent/20"
                  : "bg-base-700/50 text-slate-400 hover:text-white hover:bg-base-700"
              }`}
            >
              {pos === "ALL" ? "All" : positionLabel(pos)}
            </button>
          ))}
        </div>

        {/* Expandable filters */}
        {showFilters && (
          <div className="card p-4 flex flex-col sm:flex-row gap-4 animate-in fade-in duration-200">
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Team</label>
              <div className="relative">
                <select
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  className="input w-full appearance-none pr-8"
                >
                  <option value="ALL">All Teams</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Sort by</label>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  className="input w-full appearance-none pr-8"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results count */}
      <p className="text-xs text-slate-500 mb-4">
        Showing {filtered.length} of {data.length} players
        {sortBy !== "rating" && <span> &middot; Sorted by {SORT_OPTIONS.find((s) => s.key === sortBy)?.label}</span>}
      </p>

      {filtered.length === 0 ? (
        <EmptyState message="No players match your filters" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <PlayerCard key={p.id} player={p} sortBy={sortBy} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerCard({ player, sortBy }: { player: PlayerWithTeam; sortBy: SortKey }) {
  const hasRating = player.rating > 0;

  return (
    <Link
      to={`/players/${player.id}`}
      className="card card-hover p-4 group"
    >
      <div className="flex items-center gap-3">
        {player.photo_url ? (
          <img
            src={player.photo_url}
            alt={player.name}
            className="h-12 w-12 rounded-xl object-cover bg-base-700"
            loading="lazy"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-base-700 text-sm font-semibold text-slate-300">
            {player.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white group-hover:text-accent transition-colors truncate">
            {player.name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-slate-500">{player.nationality}</span>
            {player.age > 0 && <span className="text-xs text-slate-600">{player.age}y</span>}
            {player.injured && (
              <span className="text-[10px] font-bold text-bad bg-bad/10 px-1.5 py-0.5 rounded">INJ</span>
            )}
          </div>
        </div>
        <span
          className="font-mono text-sm font-bold"
          style={{ color: hasRating ? ratingColor(player.rating) : "#64748b" }}
        >
          {hasRating ? player.rating.toFixed(1) : "--"}
        </span>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <span
          className="badge"
          style={{ backgroundColor: `${positionColor(player.position)}15`, color: positionColor(player.position) }}
        >
          {player.position}
        </span>
        {player.team && (
          <div className="flex items-center gap-1.5">
            {player.team.logo_url ? (
              <img src={player.team.logo_url} alt="" className="h-4 w-4 object-contain" loading="lazy" />
            ) : (
              <TeamBadge short_name={player.team.short_name} color={player.team.primary_color} size="sm" />
            )}
            <span className="text-xs text-slate-400">{player.team.short_name}</span>
          </div>
        )}
        {player.jersey_number != null && (
          <span className="text-xs text-slate-600 ml-auto">#{player.jersey_number}</span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1 mt-4 pt-3 border-t border-base-700/60">
        <StatCell label="Goals" value={player.goals} highlight={sortBy === "goals"} />
        <StatCell label="Assists" value={player.assists} highlight={sortBy === "assists"} />
        <StatCell label="Apps" value={player.appearances} highlight={sortBy === "appearances"} />
        <StatCell label="Mins" value={player.minutes_played > 0 ? Math.round(player.minutes_played / 60) + "h" : "0"} highlight={sortBy === "minutes_played"} />
      </div>
    </Link>
  );
}

function StatCell({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="text-center">
      <p className={`font-mono text-sm font-bold ${highlight ? "text-accent" : "text-white"}`}>{value}</p>
      <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}
