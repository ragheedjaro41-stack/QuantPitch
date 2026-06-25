import { useState } from "react";
import { Link } from "react-router-dom";
import { useTeamStats, useRealLeagues, getLeagueStatus } from "../lib/hooks";
import { PageHeader, Spinner, ErrorState, TeamBadge, LeagueSelector, LeagueStatusBadge, EmptyState } from "../components/ui";

export default function Teams() {
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const { data: leagues } = useRealLeagues();
  const { data, isLoading, isError } = useTeamStats(leagueId);

  const selectedLeague = leagues?.find((l) => l.id === leagueId);
  const subtitle = selectedLeague ? `${selectedLeague.name} standings` : "All league standings";

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
      <PageHeader title="Teams" subtitle={subtitle}>
        {leagues && (
          <div className="flex items-center gap-3">
            {selectedLeague && <LeagueStatusBadge status={getLeagueStatus(selectedLeague)} />}
            <LeagueSelector leagues={leagues} selected={leagueId} onChange={setLeagueId} />
          </div>
        )}
      </PageHeader>

      {isLoading ? (
        <Spinner />
      ) : isError || !data ? (
        <ErrorState message="Failed to load teams" />
      ) : data.length === 0 ? (
        <EmptyState message="No teams found for this league" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-base-700 bg-base-700/30">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 w-12">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Team</th>
                {!leagueId && <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">League</th>}
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">P</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">W</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">D</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">L</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">GF</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">GA</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">GD</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">Pts</th>
              </tr>
            </thead>
            <tbody>
              {data.map((team, i) => {
                const leagueName = leagues?.find((l) => l.id === team.league_id)?.short_name;
                return (
                  <tr
                    key={team.id}
                    className="border-b border-base-700/50 transition-colors hover:bg-base-700/30"
                  >
                    <td className="px-4 py-3.5">
                      <span className={`font-mono text-sm ${i < 3 ? "text-accent font-semibold" : "text-slate-500"}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Link to={`/teams/${team.id}`} className="flex items-center gap-3 group">
                        <TeamBadge short_name={team.short_name} color={team.primary_color} size="sm" logo_url={team.logo_url} />
                        <div>
                          <p className="text-sm font-medium text-white group-hover:text-accent transition-colors">{team.name}</p>
                          <p className="text-xs text-slate-500">{team.city}</p>
                        </div>
                      </Link>
                    </td>
                    {!leagueId && (
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-slate-400">{leagueName ?? "--"}</span>
                      </td>
                    )}
                    <td className="px-4 py-3.5 text-center font-mono text-sm text-slate-300">{team.played}</td>
                    <td className="px-4 py-3.5 text-center font-mono text-sm text-good">{team.won}</td>
                    <td className="px-4 py-3.5 text-center font-mono text-sm text-slate-300">{team.drawn}</td>
                    <td className="px-4 py-3.5 text-center font-mono text-sm text-bad">{team.lost}</td>
                    <td className="px-4 py-3.5 text-center font-mono text-sm text-slate-300">{team.goals_for}</td>
                    <td className="px-4 py-3.5 text-center font-mono text-sm text-slate-300">{team.goals_against}</td>
                    <td className="px-4 py-3.5 text-center font-mono text-sm">
                      <span className={team.goal_diff > 0 ? "text-good" : team.goal_diff < 0 ? "text-bad" : "text-slate-400"}>
                        {team.goal_diff > 0 ? "+" : ""}{team.goal_diff}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="font-mono text-sm font-bold text-white">{team.points}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
