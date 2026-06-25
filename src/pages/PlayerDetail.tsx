import { useParams, Link } from "react-router-dom";
import { Flag, Ruler, Weight, Cake, CircleAlert as AlertCircle, Clock, Shirt } from "lucide-react";
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
import { positionColor, positionLabel, ratingColor } from "../lib/utils";

export default function PlayerDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: player, isLoading } = usePlayer(id);

  if (isLoading) return <Spinner />;
  if (!player) return <ErrorState message="Player not found" />;

  const isGK = player.position === "GK";
  const hasRating = player.rating > 0;
  const minPerGoal = player.goals > 0 && player.minutes_played > 0
    ? Math.round(player.minutes_played / player.goals)
    : null;

  const missingFields: string[] = [];
  if (!hasRating) missingFields.push("Rating");
  if (player.height_cm == null) missingFields.push("Height");
  if (player.weight_kg == null) missingFields.push("Weight");

  const radarData = isGK
    ? [
        { stat: "Apps", value: Math.min(player.appearances * 3, 100) },
        { stat: "CS", value: Math.min(player.clean_sheets * 8, 100) },
        { stat: "Saves", value: Math.min(player.saves * 2, 100) },
        { stat: "Rating", value: hasRating ? (player.rating / 10) * 100 : 0 },
        { stat: "Minutes", value: Math.min(player.minutes_played / 35, 100) },
      ]
    : [
        { stat: "Goals", value: Math.min(player.goals * 5, 100) },
        { stat: "Assists", value: Math.min(player.assists * 8, 100) },
        { stat: "Apps", value: Math.min(player.appearances * 3, 100) },
        { stat: "Rating", value: hasRating ? (player.rating / 10) * 100 : 0 },
        { stat: "Minutes", value: Math.min(player.minutes_played / 35, 100) },
      ];

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
      <BackLink to="/players" label="All Players" />

      {/* Player header */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {player.photo_url ? (
            <img
              src={player.photo_url}
              alt={player.name}
              className="h-24 w-24 rounded-2xl object-cover bg-base-700 shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-base-700 text-2xl font-bold text-slate-300 shrink-0">
              {player.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{player.name}</h1>
              <span
                className="badge text-xs"
                style={{ backgroundColor: `${positionColor(player.position)}15`, color: positionColor(player.position) }}
              >
                {positionLabel(player.position)}
              </span>
              {player.injured && (
                <span className="badge bg-bad/10 text-bad border border-bad/20 flex items-center gap-1 text-xs">
                  <AlertCircle size={11} /> Injured
                </span>
              )}
            </div>

            {/* Bio info */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-sm text-slate-400">
              <span className="flex items-center gap-1.5"><Flag size={14} /> {player.nationality}</span>
              {player.age > 0 && <span className="flex items-center gap-1.5"><Cake size={14} /> {player.age} years</span>}
              {player.height_cm != null && <span className="flex items-center gap-1.5"><Ruler size={14} /> {player.height_cm} cm</span>}
              {player.weight_kg != null && <span className="flex items-center gap-1.5"><Weight size={14} /> {player.weight_kg} kg</span>}
              {player.jersey_number != null && <span className="flex items-center gap-1.5"><Shirt size={14} /> #{player.jersey_number}</span>}
            </div>

            {player.team && (
              <Link to={`/teams/${player.team.id}`} className="inline-flex items-center gap-2 mt-3 group">
                {player.team.logo_url ? (
                  <img src={player.team.logo_url} alt="" className="h-5 w-5 object-contain" />
                ) : (
                  <TeamBadge short_name={player.team.short_name} color={player.team.primary_color} size="sm" />
                )}
                <span className="text-sm text-slate-300 group-hover:text-accent transition-colors">{player.team.name}</span>
              </Link>
            )}
          </div>

          {/* Rating badge */}
          <div className="text-right shrink-0 hidden sm:block">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Rating</p>
            <p
              className="font-mono text-4xl font-bold mt-1"
              style={{ color: hasRating ? ratingColor(player.rating) : "#475569" }}
            >
              {hasRating ? player.rating.toFixed(1) : "--"}
            </p>
            {!hasRating && <p className="text-[10px] text-slate-600 mt-1">Not rated</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats panel */}
        <div className="card p-6 lg:col-span-1">
          <h2 className="text-base font-semibold text-white mb-5">Season Stats</h2>
          <div className="space-y-1">
            <StatRow label="Appearances" value={player.appearances} icon={<Clock size={14} className="text-slate-500" />} />
            <StatRow label="Minutes" value={player.minutes_played > 0 ? player.minutes_played.toLocaleString() : "0"} />
            <div className="border-t border-base-700/40 my-3" />
            <StatRow label="Goals" value={player.goals} accent="#10B981" />
            <StatRow label="Assists" value={player.assists} accent="#00D4FF" />
            {!isGK && minPerGoal && (
              <StatRow label="Min / Goal" value={minPerGoal} accent="#94a3b8" />
            )}
            <div className="border-t border-base-700/40 my-3" />
            <StatRow label="Yellow Cards" value={player.yellow_cards} accent="#fbbf24" />
            <StatRow label="Red Cards" value={player.red_cards} accent="#f87171" />
            {isGK && (
              <>
                <div className="border-t border-base-700/40 my-3" />
                <StatRow label="Clean Sheets" value={player.clean_sheets} accent="#10B981" />
                <StatRow label="Saves" value={player.saves} accent="#00D4FF" />
              </>
            )}
          </div>

          {/* Missing fields notice */}
          {missingFields.length > 0 && (
            <div className="mt-5 rounded-xl bg-base-700/30 border border-base-700/60 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Provider Missing</p>
              <div className="flex flex-wrap gap-1.5">
                {missingFields.map((f) => (
                  <span key={f} className="text-[10px] text-slate-500 bg-base-700/60 px-2 py-0.5 rounded-full">{f}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Radar chart */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="text-base font-semibold text-white mb-1">Performance Profile</h2>
          <p className="text-xs text-slate-500 mb-4">{positionLabel(player.position)} attributes</p>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#1e2740" />
              <PolarAngleAxis dataKey="stat" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
              <Radar
                dataKey="value"
                stroke="#00D4FF"
                fill="#00D4FF"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>

          {/* Rating shown on mobile */}
          <div className="sm:hidden mt-4 pt-4 border-t border-base-700/40 flex items-center justify-between">
            <span className="text-sm text-slate-400">Rating</span>
            <span
              className="font-mono text-2xl font-bold"
              style={{ color: hasRating ? ratingColor(player.rating) : "#475569" }}
            >
              {hasRating ? player.rating.toFixed(1) : "--"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, accent, icon }: { label: string; value: string | number; accent?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="flex items-center gap-2 text-sm text-slate-400">
        {icon}
        {label}
      </span>
      <span className="font-mono text-base font-semibold" style={{ color: accent || "#fff" }}>{value}</span>
    </div>
  );
}
