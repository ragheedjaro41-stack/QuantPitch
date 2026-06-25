import { useParams, Link } from "react-router-dom";
import { MapPin, Calendar, Users } from "lucide-react";
import { useTeam, useTeamPlayers, useTeamMatches, useTeamStats } from "../lib/hooks";
import { PageHeader, Spinner, ErrorState, TeamBadge, BackLink, EmptyState } from "../components/ui";
import { positionGroup, positionColor, ratingColor, formatDate } from "../lib/utils";

export default function TeamDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: team, isLoading: teamLoading } = useTeam(id);
  const { data: players, isLoading: playersLoading } = useTeamPlayers(id);
  const { data: matches, isLoading: matchesLoading } = useTeamMatches(id);
  const { data: allStats } = useTeamStats(team?.league_id ?? null);

  if (teamLoading) return <Spinner />;
  if (!team) return <ErrorState message="Team not found" />;

  const teamStat = allStats?.find((s) => s.id === team.id);
  const isLoading = playersLoading || matchesLoading;

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
      <BackLink to="/teams" label="All Teams" />

      {/* Team header */}
      <div className="card p-5 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
          <TeamBadge short_name={team.short_name} color={team.primary_color} size="lg" logo_url={team.logo_url} />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white">{team.name}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-slate-400">
              <span className="flex items-center gap-1.5">
                <MapPin size={14} /> {team.city}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={14} /> Founded {team.founded}
              </span>
              <span className="flex items-center gap-1.5">
                <Users size={14} /> {team.stadium}
              </span>
            </div>
          </div>
        </div>
        {teamStat && (
          <div className="flex gap-4 sm:gap-6 mt-4 pt-4 border-t border-base-700/40">
            <div className="text-center flex-1">
              <p className="stat-label">Points</p>
              <p className="font-mono text-xl sm:text-2xl font-bold text-accent mt-1">{teamStat.points}</p>
            </div>
            <div className="text-center flex-1">
              <p className="stat-label">Played</p>
              <p className="font-mono text-xl sm:text-2xl font-bold text-white mt-1">{teamStat.played}</p>
            </div>
            <div className="text-center flex-1">
              <p className="stat-label">GD</p>
              <p className={`font-mono text-xl sm:text-2xl font-bold mt-1 ${teamStat.goal_diff > 0 ? "text-good" : teamStat.goal_diff < 0 ? "text-bad" : "text-slate-300"}`}>
                {teamStat.goal_diff > 0 ? "+" : ""}{teamStat.goal_diff}
              </p>
            </div>
            <div className="text-center flex-1">
              <p className="stat-label">W-D-L</p>
              <p className="font-mono text-xl sm:text-2xl font-bold text-white mt-1">
                <span className="text-good">{teamStat.won}</span>
                <span className="text-slate-600">-</span>
                <span>{teamStat.drawn}</span>
                <span className="text-slate-600">-</span>
                <span className="text-bad">{teamStat.lost}</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Squad */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Squad</h2>
            {players && players.length > 0 ? (
              <div className="space-y-2">
                {players.map((p) => (
                  <Link
                    key={p.id}
                    to={`/players/${p.id}`}
                    className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-base-700/50"
                  >
                    <span className="font-mono text-sm text-slate-500 w-8 text-center">{p.jersey_number}</span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold" style={{ backgroundColor: `${positionColor(p.position)}20`, color: positionColor(p.position) }}>
                      {p.position}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{p.name}</p>
                      <p className="text-xs text-slate-500">{positionGroup(p.position)} · {p.nationality}</p>
                    </div>
                    <span className="font-mono text-sm font-semibold" style={{ color: ratingColor(p.rating) }}>
                      {p.rating.toFixed(1)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState message="No players in squad" />
            )}
          </div>

          {/* Recent matches */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Matches</h2>
            {matches && matches.length > 0 ? (
              <div className="space-y-2">
                {matches.slice(0, 8).map((m) => {
                  const isHome = m.home_team_id === team.id;
                  const scored = isHome ? m.home_score : m.away_score;
                  const conceded = isHome ? m.away_score : m.home_score;
                  const result = scored > conceded ? "W" : scored === conceded ? "D" : "L";
                  const resultColor = result === "W" ? "text-good bg-good/10" : result === "D" ? "text-warn bg-warn/10" : "text-bad bg-bad/10";

                  return (
                    <Link
                      key={m.id}
                      to={`/matches/${m.id}`}
                      className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-base-700/50"
                    >
                      <span className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold ${resultColor}`}>
                        {result}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {isHome ? "vs" : "@"} {isHome ? m.away_team?.short_name : m.home_team?.short_name}
                        </p>
                        <p className="text-xs text-slate-500">{formatDate(m.match_date)}</p>
                      </div>
                      <span className="font-mono text-sm text-slate-300">{scored}-{conceded}</span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <EmptyState message="No matches played" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
