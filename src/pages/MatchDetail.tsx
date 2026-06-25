import { useParams } from "react-router-dom";
import { MapPin, Clock } from "lucide-react";
import { useMatch, useMatchEvents } from "../lib/hooks";
import { Spinner, ErrorState, TeamBadge, BackLink, EmptyState } from "../components/ui";
import { formatDate, formatTime } from "../lib/utils";
import type { MatchEventWithPlayer } from "../types";

const EVENT_ICONS: Record<string, string> = {
  goal: "⚽",
  yellow_card: "🟨",
  red_card: "🟥",
  substitution: "🔄",
};

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: match, isLoading: matchLoading } = useMatch(id);
  const { data: events, isLoading: eventsLoading } = useMatchEvents(id);

  if (matchLoading) return <Spinner />;
  if (!match) return <ErrorState message="Match not found" />;

  const isLoading = eventsLoading;

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-5xl mx-auto">
      <BackLink to="/matches" label="All Matches" />

      {/* Scoreboard */}
      <div className="card p-5 sm:p-8 mb-6">
        <div className="text-center mb-4 sm:mb-6">
          <span className="badge bg-base-700/60 text-slate-400">Round {match.round}</span>
          <p className="text-sm text-slate-400 mt-2">{formatDate(match.match_date)} · {formatTime(match.match_date)}</p>
        </div>

        <div className="flex items-center justify-center gap-4 sm:gap-8">
          <div className="flex flex-col items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <TeamBadge short_name={match.home_team?.short_name || "?"} color={match.home_team?.primary_color || "#666"} size="lg" logo_url={match.home_team?.logo_url} />
            <p className="text-xs sm:text-sm font-semibold text-white text-center truncate max-w-full">{match.home_team?.name}</p>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <span className="font-mono text-3xl sm:text-5xl font-bold text-white">{match.home_score}</span>
            <span className="text-xl sm:text-3xl text-slate-600">-</span>
            <span className="font-mono text-3xl sm:text-5xl font-bold text-white">{match.away_score}</span>
          </div>

          <div className="flex flex-col items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <TeamBadge short_name={match.away_team?.short_name || "?"} color={match.away_team?.primary_color || "#666"} size="lg" logo_url={match.away_team?.logo_url} />
            <p className="text-xs sm:text-sm font-semibold text-white text-center truncate max-w-full">{match.away_team?.name}</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 sm:gap-6 mt-4 sm:mt-6 text-xs sm:text-sm text-slate-400">
          <span className="flex items-center gap-1.5"><MapPin size={14} /> {match.venue}</span>
          <span className="flex items-center gap-1.5"><Clock size={14} /> {match.status === "completed" ? "Full Time" : "Scheduled"}</span>
        </div>
      </div>

      {/* Match events timeline */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Match Events</h2>
        {isLoading ? (
          <Spinner />
        ) : !events || events.length === 0 ? (
          <EmptyState message="No events recorded for this match" />
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-base-700" />
            <div className="space-y-4">
              {events.map((event) => (
                <EventRow key={event.id} event={event} homeTeamId={match.home_team_id} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EventRow({ event, homeTeamId }: { event: MatchEventWithPlayer; homeTeamId: string }) {
  const isHome = event.team_id === homeTeamId;
  const icon = EVENT_ICONS[event.event_type] || "•";
  const eventLabel = event.event_type.replace("_", " ");

  return (
    <div className={`relative flex items-center gap-4 pl-10 ${isHome ? "" : "flex-row-reverse text-right"}`}>
      <div className="absolute left-4 -translate-x-1/2 flex h-3 w-3 items-center justify-center rounded-full bg-accent" />
      <div className={`flex items-center gap-3 flex-1 ${isHome ? "" : "flex-row-reverse"}`}>
        <span className="font-mono text-sm text-slate-500 w-10">{event.minute}'</span>
        <span className="text-lg">{icon}</span>
        <div className="flex-1">
          <p className="text-sm text-white">
            {event.player?.name || "Unknown"}{" "}
            <span className="text-slate-500 capitalize">{eventLabel}</span>
          </p>
          {event.description && (
            <p className="text-xs text-slate-500 mt-0.5">{event.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
