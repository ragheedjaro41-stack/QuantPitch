import { Link } from "react-router-dom";
import { useMatches } from "../lib/hooks";
import { PageHeader, Spinner, ErrorState, TeamBadge, EmptyState } from "../components/ui";
import { formatDate, formatTime } from "../lib/utils";

export default function Matches() {
  const { data, isLoading, isError } = useMatches();

  if (isLoading) return <Spinner />;
  if (isError || !data) return <ErrorState message="Failed to load matches" />;

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
      <PageHeader title="Matches" subtitle={`${data.length} matches this season`} />

      {data.length === 0 ? (
        <EmptyState message="No matches found" />
      ) : (
        <div className="space-y-3">
          {data.map((m) => (
            <Link
              key={m.id}
              to={`/matches/${m.id}`}
              className="card card-hover p-4 flex items-center gap-4 group"
            >
              <div className="flex flex-col items-center w-16">
                <span className="badge bg-base-700/60 text-slate-400">R{m.round}</span>
                <span className="text-xs text-slate-500 mt-1">{formatDate(m.match_date)}</span>
              </div>

              <div className="flex-1 flex items-center justify-center gap-4">
                <div className="flex items-center gap-2.5 flex-1 justify-end">
                  <span className="text-sm font-medium text-white group-hover:text-accent transition-colors text-right">
                    {m.home_team?.name}
                  </span>
                  <TeamBadge short_name={m.home_team?.short_name || "?"} color={m.home_team?.primary_color || "#666"} size="sm" logo_url={m.home_team?.logo_url} />
                </div>

                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-base-700/60">
                  <span className="font-mono text-lg font-bold text-white">{m.home_score}</span>
                  <span className="text-slate-500 text-sm">-</span>
                  <span className="font-mono text-lg font-bold text-white">{m.away_score}</span>
                </div>

                <div className="flex items-center gap-2.5 flex-1">
                  <TeamBadge short_name={m.away_team?.short_name || "?"} color={m.away_team?.primary_color || "#666"} size="sm" logo_url={m.away_team?.logo_url} />
                  <span className="text-sm font-medium text-white group-hover:text-accent transition-colors">
                    {m.away_team?.name}
                  </span>
                </div>
              </div>

              <div className="hidden md:block w-32 text-right">
                <p className="text-xs text-slate-500">{m.venue}</p>
                <p className="text-xs text-slate-600 mt-0.5">{formatTime(m.match_date)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
