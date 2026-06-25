import { useState } from "react";
import { Link } from "react-router-dom";
import { usePlayers } from "../lib/hooks";
import { PageHeader, Spinner, ErrorState, TeamBadge, EmptyState } from "../components/ui";
import { positionColor, positionGroup, ratingColor } from "../lib/utils";
import type { PlayerWithTeam } from "../types";

export default function Players() {
  const { data, isLoading, isError } = usePlayers();
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("ALL");

  if (isLoading) return <Spinner />;
  if (isError || !data) return <ErrorState message="Failed to load players" />;

  const filtered = data.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesPos = posFilter === "ALL" || positionGroup(p.position) === posFilter;
    return matchesSearch && matchesPos;
  });

  const positions = ["ALL", "Goalkeeper", "Defender", "Midfielder", "Forward"];

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <PageHeader title="Players" subtitle={`${data.length} players in the league`} />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search players..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input flex-1"
        />
        <div className="flex gap-2">
          {positions.map((pos) => (
            <button
              key={pos}
              onClick={() => setPosFilter(pos)}
              className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
                posFilter === pos
                  ? "bg-accent text-base-900"
                  : "bg-base-700/50 text-slate-400 hover:text-white"
              }`}
            >
              {pos === "ALL" ? "All" : pos.slice(0, 3).toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No players match your filters" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <PlayerCard key={p.id} player={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerCard({ player }: { player: PlayerWithTeam }) {
  return (
    <Link
      to={`/players/${player.id}`}
      className="card card-hover p-4 group"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-base-700 text-sm font-semibold text-slate-300">
          {player.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white group-hover:text-accent transition-colors truncate">
            {player.name}
          </p>
          <p className="text-xs text-slate-500">{player.nationality} · {player.age}y</p>
        </div>
        <span
          className="font-mono text-sm font-bold"
          style={{ color: ratingColor(player.rating) }}
        >
          {player.rating.toFixed(1)}
        </span>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <span
          className="badge"
          style={{ backgroundColor: `${positionColor(player.position)}20`, color: positionColor(player.position) }}
        >
          {player.position}
        </span>
        {player.team && (
          <div className="flex items-center gap-1.5">
            <TeamBadge short_name={player.team.short_name} color={player.team.primary_color} size="sm" />
            <span className="text-xs text-slate-400">{player.team.short_name}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-base-700">
        <div className="text-center">
          <p className="font-mono text-lg font-bold text-white">{player.goals}</p>
          <p className="text-xs text-slate-500">Goals</p>
        </div>
        <div className="text-center">
          <p className="font-mono text-lg font-bold text-white">{player.assists}</p>
          <p className="text-xs text-slate-500">Assists</p>
        </div>
        <div className="text-center">
          <p className="font-mono text-lg font-bold text-white">{player.appearances}</p>
          <p className="text-xs text-slate-500">Apps</p>
        </div>
      </div>
    </Link>
  );
}
