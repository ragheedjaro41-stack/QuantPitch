import { useParams, Link } from "react-router-dom";
import { Flag, Ruler, Weight, Cake } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { usePlayer } from "../lib/hooks";
import { PageHeader, Spinner, ErrorState, TeamBadge, BackLink } from "../components/ui";
import { positionColor, positionGroup, ratingColor } from "../lib/utils";

export default function PlayerDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: player, isLoading } = usePlayer(id);

  if (isLoading) return <Spinner />;
  if (!player) return <ErrorState message="Player not found" />;

  const radarData = [
    { stat: "Goals", value: Math.min(player.goals * 6, 100) },
    { stat: "Assists", value: Math.min(player.assists * 10, 100) },
    { stat: "Apps", value: Math.min(player.appearances * 4.5, 100) },
    { stat: "Rating", value: (player.rating / 10) * 100 },
    { stat: "Form", value: Math.min((player.goals + player.assists) * 5, 100) },
  ];

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <BackLink to="/players" label="All Players" />

      {/* Player header */}
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-base-700 text-2xl font-bold text-slate-300">
            {player.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{player.name}</h1>
              <span
                className="badge"
                style={{ backgroundColor: `${positionColor(player.position)}20`, color: positionColor(player.position) }}
              >
                {player.position}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-400">
              <span className="flex items-center gap-1.5"><Flag size={14} /> {player.nationality}</span>
              <span className="flex items-center gap-1.5"><Cake size={14} /> {player.age} years</span>
              {player.height_cm && <span className="flex items-center gap-1.5"><Ruler size={14} /> {player.height_cm}cm</span>}
              {player.weight_kg && <span className="flex items-center gap-1.5"><Weight size={14} /> {player.weight_kg}kg</span>}
              <span className="text-slate-500">#{player.jersey_number}</span>
            </div>
            {player.team && (
              <Link to={`/teams/${player.team.id}`} className="inline-flex items-center gap-2 mt-3 group">
                <TeamBadge short_name={player.team.short_name} color={player.team.primary_color} size="sm" />
                <span className="text-sm text-slate-300 group-hover:text-accent transition-colors">{player.team.name}</span>
              </Link>
            )}
          </div>
          <div className="text-right">
            <p className="stat-label">Rating</p>
            <p className="font-mono text-4xl font-bold mt-1" style={{ color: ratingColor(player.rating) }}>
              {player.rating.toFixed(1)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats */}
        <div className="card p-6 lg:col-span-1">
          <h2 className="text-lg font-semibold text-white mb-4">Season Stats</h2>
          <div className="space-y-4">
            <StatRow label="Appearances" value={player.appearances} />
            <StatRow label="Goals" value={player.goals} accent="#10B981" />
            <StatRow label="Assists" value={player.assists} accent="#00D4FF" />
            <StatRow label="Goal Contributions" value={player.goals + player.assists} accent="#fbbf24" />
            <StatRow label="Goals per Match" value={(player.goals / Math.max(player.appearances, 1)).toFixed(2)} />
            <StatRow label="Minutes per Goal" value={player.goals > 0 ? Math.round((player.appearances * 90) / player.goals) : "—"} />
          </div>
        </div>

        {/* Radar chart */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-white mb-1">Performance Profile</h2>
          <p className="text-xs text-slate-400 mb-4">{positionGroup(player.position)} attributes</p>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#1e2740" />
              <PolarAngleAxis dataKey="stat" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
              <Radar
                dataKey="value"
                stroke="#00D4FF"
                fill="#00D4FF"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, accent = "#fff" }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="font-mono text-lg font-semibold" style={{ color: accent }}>{value}</span>
    </div>
  );
}
