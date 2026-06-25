import { Link } from "react-router-dom";
import { Shield, Users, Trophy, Target, TrendingUp, Lock, CircleCheck as CheckCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useDashboardStats, useTopPlays } from "../lib/hooks";
import { PageHeader, StatCard, Spinner, ErrorState, TeamBadge } from "../components/ui";
import { ratingColor } from "../lib/utils";

export default function Dashboard() {
  const { data, isLoading, isError } = useDashboardStats();
  const { data: topPlays, isLoading: playsLoading } = useTopPlays();

  if (isLoading) return <Spinner />;
  if (isError || !data) return <ErrorState message="Failed to load dashboard data" />;

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <PageHeader title="Dashboard" subtitle="Season 2025 overview" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Teams" value={data.teamCount} icon={<Shield size={18} />} accent="#00D4FF" />
        <StatCard label="Players" value={data.playerCount} icon={<Users size={18} />} accent="#10B981" />
        <StatCard label="Matches" value={data.matchCount} icon={<Trophy size={18} />} accent="#fbbf24" />
        <StatCard label="Total Goals" value={data.totalGoals} icon={<Target size={18} />} accent="#f87171" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Goals per round chart */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-1">Goals Per Round</h2>
          <p className="text-xs text-slate-400 mb-6">Scoring trends across the season</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.goalsPerRound}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2740" vertical={false} />
              <XAxis dataKey="round" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0B1020",
                  border: "1px solid #1e2740",
                  borderRadius: "12px",
                  fontSize: "13px",
                }}
                cursor={{ fill: "rgba(0,212,255,0.05)" }}
              />
              <Bar dataKey="goals" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {data.goalsPerRound.map((_, i) => (
                  <Cell key={i} fill={i % 2 === 0 ? "#00D4FF" : "#22d3ee"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top scorers */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-1">Top Scorers</h2>
          <p className="text-xs text-slate-400 mb-6">Leading goal contributors</p>
          <div className="space-y-3">
            {data.topScorers.map((player, i) => (
              <Link
                key={player.id}
                to={`/players/${player.id}`}
                className="flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-base-700/50"
              >
                <span className="font-mono text-sm text-slate-500 w-5">{i + 1}</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-base-700 text-sm font-semibold text-slate-300">
                  {player.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{player.name}</p>
                  <p className="text-xs text-slate-500">{player.position} · {player.goals}G {player.assists}A</p>
                </div>
                <span
                  className="font-mono text-sm font-semibold"
                  style={{ color: ratingColor(player.rating) }}
                >
                  {player.rating.toFixed(1)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* League average */}
      <div className="card p-6 mt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">League Average Rating</h2>
            <p className="text-xs text-slate-400 mt-1">Across all players this season</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-3xl font-bold" style={{ color: ratingColor(data.avgRating) }}>
              {data.avgRating.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 mt-1">out of 10.0</p>
          </div>
        </div>
      </div>

      {/* Top Plays — gated by live playability engine */}
      <div className="card p-6 mt-6">
        <div className="flex items-center gap-3 mb-1">
          <TrendingUp size={18} className="text-accent" />
          <h2 className="text-lg font-semibold text-white">Top Plays</h2>
          <span className="ml-auto flex items-center gap-1 text-xs text-good">
            <Lock size={11} /> Safety-gated · Tier-capped
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-5">
          Picks from playable leagues only — blocked by safety rules, confidence capped by tier
        </p>
        {playsLoading ? (
          <Spinner />
        ) : !topPlays || topPlays.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No qualifying plays found in playable leagues</p>
        ) : (
          <div className="space-y-2">
            {topPlays.slice(0, 6).map((play, i) => (
              <Link
                key={play.match_id}
                to={`/matches/${play.match_id}`}
                className="flex items-center gap-4 rounded-xl p-3 border border-base-700/40 hover:border-accent/20 hover:bg-base-700/30 transition-all group"
              >
                <span className="font-mono text-sm text-slate-500 w-5 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate group-hover:text-accent transition-colors">
                    {play.home_team_name} vs {play.away_team_name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-slate-500">{play.league_short_name}</span>
                    <span className="text-xs text-slate-600">·</span>
                    <span className="text-xs text-slate-500">T{play.tier}</span>
                    <span className="text-xs text-slate-600">·</span>
                    <span className="text-xs text-slate-500">Odds {play.odds_coverage}% · Stats {play.stats_coverage}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <CheckCircle size={12} className="text-good" />
                      <span className="text-sm font-bold text-white">{play.pick_label}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Cap {play.confidence_cap}%</p>
                  </div>
                  <div className="w-12 text-right">
                    <p className="font-mono text-base font-bold text-accent">{play.value_score}</p>
                    <p className="text-xs text-slate-600">score</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
