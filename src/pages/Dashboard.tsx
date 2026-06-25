import { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Users, Trophy, Target, TrendingUp, Lock, Radio, CircleAlert as AlertCircle, Star } from "lucide-react";
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
import { useDashboardStats, useTopPlays, useRealLeagues, getLeagueStatus } from "../lib/hooks";
import { PageHeader, StatCard, Spinner, ErrorState, LeagueSelector, LeagueStatusBadge } from "../components/ui";
import { ratingColor } from "../lib/utils";

export default function Dashboard() {
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const { data: leagues } = useRealLeagues();
  const { data, isLoading, isError } = useDashboardStats(leagueId);
  const { data: topPlays, isLoading: playsLoading } = useTopPlays();

  const selectedLeague = leagues?.find((l) => l.id === leagueId);
  const subtitle = selectedLeague ? selectedLeague.name : "All Real Leagues";

  if (isLoading && !leagues) return <Spinner />;

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
      <PageHeader title="Dashboard" subtitle={subtitle}>
        {leagues && (
          <div className="flex items-center gap-3">
            {selectedLeague && <LeagueStatusBadge status={getLeagueStatus(selectedLeague)} />}
            <LeagueSelector
              leagues={leagues}
              selected={leagueId}
              onChange={setLeagueId}
              showStatus
              getStatus={(l) => {
                const found = leagues.find((lg) => lg.id === l.id);
                return found ? getLeagueStatus(found) : "BLOCKED";
              }}
            />
          </div>
        )}
      </PageHeader>

      {isLoading ? (
        <Spinner />
      ) : isError || !data ? (
        <ErrorState message="Failed to load dashboard data" />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard label="Teams" value={data.teamCount} icon={<Shield size={18} />} accent="#00D4FF" />
            <StatCard label="Players" value={data.playerCount} icon={<Users size={18} />} accent="#10B981" />
            <StatCard label="Matches" value={data.matchCount} icon={<Trophy size={18} />} accent="#fbbf24" />
            <StatCard label="Total Goals" value={data.totalGoals} icon={<Target size={18} />} accent="#f87171" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <PlayerRankingCard
              title="Top Scorers"
              icon={<Target size={16} className="text-good" />}
              players={data.topScorers}
              statKey="goals"
              statLabel="G"
              accentColor="#10B981"
            />
            <PlayerRankingCard
              title="Top Assists"
              icon={<Star size={16} className="text-accent" />}
              players={data.topAssists}
              statKey="assists"
              statLabel="A"
              accentColor="#00D4FF"
            />
            <PlayerRankingCard
              title="Top Rated"
              icon={<Trophy size={16} className="text-warn" />}
              players={data.topRated}
              statKey="rating"
              statLabel=""
              accentColor="#fbbf24"
              formatValue={(v) => (v as number).toFixed(1)}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card p-6 lg:col-span-2">
              <h2 className="text-base font-semibold text-white mb-1">Goals Per Round</h2>
              <p className="text-xs text-slate-500 mb-6">Scoring trends across the season</p>
              {data.goalsPerRound.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.goalsPerRound}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2740" vertical={false} />
                    <XAxis dataKey="round" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0B1020",
                        border: "1px solid #1e2740",
                        borderRadius: "12px",
                        fontSize: "13px",
                      }}
                      cursor={{ fill: "rgba(0,212,255,0.05)" }}
                    />
                    <Bar dataKey="goals" radius={[6, 6, 0, 0]} maxBarSize={40}>
                      {data.goalsPerRound.map((_, i) => (
                        <Cell key={i} fill={i % 2 === 0 ? "#00D4FF" : "#22d3ee"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[260px] text-sm text-slate-500">
                  No match data for this selection
                </div>
              )}
            </div>

            <div className="card p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">Average Rating</h2>
                <p className="text-xs text-slate-500 mt-1">Across all rated players</p>
              </div>
              <div className="text-center py-8">
                <p className="font-mono text-5xl font-bold" style={{ color: ratingColor(data.avgRating) }}>
                  {data.avgRating > 0 ? data.avgRating.toFixed(2) : "--"}
                </p>
                <p className="text-xs text-slate-500 mt-2">out of 10.0</p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-base-700/40">
                <div className="text-center">
                  <p className="font-mono text-lg font-bold text-white">{data.ratedCount}</p>
                  <p className="text-[10px] text-slate-500">Rated players</p>
                </div>
                <div className="text-center">
                  <p className="font-mono text-lg font-bold text-slate-500">{data.playerCount - data.ratedCount}</p>
                  <p className="text-[10px] text-slate-500">Not rated</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Top Plays -- gated by live playability engine */}
      <div className="card p-6 mt-6">
        <div className="flex items-center gap-3 mb-1">
          <TrendingUp size={18} className="text-accent" />
          <h2 className="text-base font-semibold text-white">Top Plays</h2>
          <span className="ml-auto flex items-center gap-1 text-xs text-slate-500">
            <Lock size={11} /> LIVE_PICK only
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-2">
          Only leagues with <span className="text-good font-semibold">LIVE_PICK</span> status appear here.
        </p>
        <div className="flex items-center gap-2 mb-5 p-3 rounded-xl bg-warn/5 border border-warn/20">
          <AlertCircle size={13} className="text-warn shrink-0" />
          <p className="text-xs text-warn">
            No live odds feed connected -- all leagues currently show BLOCKED_PICK or DEMO_PICK.
            Connect a real odds provider and set <code className="text-xs bg-base-700/60 px-1 rounded">has_live_odds=true</code> to activate LIVE_PICK.
          </p>
        </div>
        {playsLoading ? (
          <Spinner />
        ) : !topPlays || topPlays.length === 0 ? (
          <div className="text-center py-8">
            <Radio size={28} className="text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-400">No live picks available</p>
            <p className="text-xs text-slate-600 mt-1">Activate a league with a live odds feed to see picks here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {topPlays.slice(0, 6).map((play, i) => {
              const statusCfg = {
                LIVE_PICK: { cls: "bg-good/10 text-good border-good/20", label: "LIVE" },
                DEMO_PICK: { cls: "bg-warn/10 text-warn border-warn/20", label: "DEMO" },
                BLOCKED_PICK: { cls: "bg-slate-700/50 text-slate-500 border-slate-600", label: "BLOCKED" },
              }[play.pick_status];
              return (
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
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold border ${statusCfg.cls}`}>
                        {statusCfg.label}
                      </span>
                      <span className="text-xs text-slate-500">{play.league_short_name}</span>
                      <span className="text-xs text-slate-600">T{play.tier}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{play.pick_label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Cap {play.confidence_cap}%</p>
                    </div>
                    <div className="w-12 text-right">
                      <p className="font-mono text-base font-bold text-accent">{play.value_score}</p>
                      <p className="text-xs text-slate-600">score</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

type RankingPlayer = {
  id: string;
  name: string;
  photo_url: string | null;
  team_name: string;
  team_logo_url: string | null;
  goals: number;
  assists: number;
  rating: number;
  appearances: number;
};

function PlayerRankingCard({
  title,
  icon,
  players,
  statKey,
  statLabel,
  accentColor,
  formatValue,
}: {
  title: string;
  icon: React.ReactNode;
  players: RankingPlayer[];
  statKey: keyof RankingPlayer;
  statLabel: string;
  accentColor: string;
  formatValue?: (v: unknown) => string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      {players.length === 0 ? (
        <div className="text-center py-8">
          <Users size={24} className="text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No data yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {players.map((p, i) => (
            <Link
              key={p.id}
              to={`/players/${p.id}`}
              className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-base-700/40 group"
            >
              <span className="font-mono text-xs text-slate-600 w-4">{i + 1}</span>
              {p.photo_url ? (
                <img src={p.photo_url} alt="" className="h-8 w-8 rounded-lg object-cover bg-base-700" loading="lazy" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-base-700 text-[10px] font-semibold text-slate-400">
                  {p.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate group-hover:text-accent transition-colors">{p.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{p.team_name} &middot; {p.appearances} apps</p>
              </div>
              <span className="font-mono text-sm font-bold shrink-0" style={{ color: accentColor }}>
                {formatValue ? formatValue(p[statKey]) : String(p[statKey])}{statLabel}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
