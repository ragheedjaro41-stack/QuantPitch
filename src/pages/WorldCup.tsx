import { Link } from "react-router-dom";
import { Trophy, Target, Users } from "lucide-react";
import { useWorldCupGroups, useWorldCupKnockout, useWorldCupTopScorers } from "../lib/hooks";
import { PageHeader, Spinner, ErrorState, TeamBadge } from "../components/ui";
import { formatDate, ratingColor } from "../lib/utils";
import type { WCKnockoutMatch, TeamWithStats } from "../types";

const STAGE_LABELS: Record<string, string> = {
  round_of_16: "Round of 16",
  quarterfinal: "Quarterfinal",
  semifinal: "Semifinal",
  third_place: "3rd Place",
  final: "Final",
};

function MatchCard({ match }: { match: WCKnockoutMatch }) {
  const homeWon = match.home_score > match.away_score;
  const awayWon = match.away_score > match.home_score;
  return (
    <Link
      to={`/matches/${match.id}`}
      className="flex items-center gap-3 rounded-xl border border-base-700/60 bg-base-800/60 p-3 hover:border-accent/30 hover:bg-base-700/40 transition-all group"
    >
      <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
        <span className={`text-xs font-medium truncate text-right ${homeWon ? "text-white" : "text-slate-400"}`}>
          {match.home_team?.name}
        </span>
        <TeamBadge
          short_name={match.home_team?.short_name || "?"}
          color={match.home_team?.primary_color || "#666"}
          size="sm"
        />
      </div>
      <div className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-lg bg-base-700/80">
        <span className={`font-mono text-base font-bold ${homeWon ? "text-white" : "text-slate-400"}`}>
          {match.home_score}
        </span>
        <span className="text-slate-600 text-xs">–</span>
        <span className={`font-mono text-base font-bold ${awayWon ? "text-white" : "text-slate-400"}`}>
          {match.away_score}
        </span>
      </div>
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <TeamBadge
          short_name={match.away_team?.short_name || "?"}
          color={match.away_team?.primary_color || "#666"}
          size="sm"
        />
        <span className={`text-xs font-medium truncate ${awayWon ? "text-white" : "text-slate-400"}`}>
          {match.away_team?.name}
        </span>
      </div>
    </Link>
  );
}

function GroupTable({ group }: { group: { name: string; teams: TeamWithStats[] } }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-base-700 bg-base-700/20">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/10 border border-accent/30 text-xs font-bold text-accent font-mono">
          {group.name}
        </span>
        <span className="text-sm font-semibold text-white">Group {group.name}</span>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-base-700/40">
            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-6">#</th>
            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Team</th>
            <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">P</th>
            <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">W</th>
            <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">D</th>
            <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">L</th>
            <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">GD</th>
            <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Pts</th>
          </tr>
        </thead>
        <tbody>
          {group.teams.map((team, i) => (
            <tr
              key={team.id}
              className={`border-b border-base-700/30 last:border-0 transition-colors hover:bg-base-700/20 ${i < 2 ? "relative" : ""}`}
            >
              <td className="px-4 py-2.5">
                <span className={`font-mono text-xs ${i < 2 ? "text-accent font-bold" : "text-slate-600"}`}>{i + 1}</span>
              </td>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <TeamBadge short_name={team.short_name} color={team.primary_color} size="sm" />
                  <span className="text-sm font-medium text-white">{team.name}</span>
                  {i < 2 && (
                    <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20 font-mono">
                      ADV
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-2.5 text-center font-mono text-xs text-slate-400">{team.played}</td>
              <td className="px-4 py-2.5 text-center font-mono text-xs text-good">{team.won}</td>
              <td className="px-4 py-2.5 text-center font-mono text-xs text-slate-400">{team.drawn}</td>
              <td className="px-4 py-2.5 text-center font-mono text-xs text-bad">{team.lost}</td>
              <td className="px-4 py-2.5 text-center font-mono text-xs">
                <span className={team.goal_diff > 0 ? "text-good" : team.goal_diff < 0 ? "text-bad" : "text-slate-400"}>
                  {team.goal_diff > 0 ? "+" : ""}{team.goal_diff}
                </span>
              </td>
              <td className="px-4 py-2.5 text-center font-mono text-sm font-bold text-white">{team.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function WorldCup() {
  const groups = useWorldCupGroups();
  const knockout = useWorldCupKnockout();
  const scorers = useWorldCupTopScorers();

  const isLoading = groups.isLoading || knockout.isLoading || scorers.isLoading;
  const isError = groups.isError || knockout.isError || scorers.isError;

  if (isLoading) return <Spinner />;
  if (isError) return <ErrorState message="Failed to load World Cup data" />;

  const knockoutByStage = (knockout.data || []).reduce<Record<string, WCKnockoutMatch[]>>(
    (acc, m) => {
      const s = m.stage || "other";
      if (!acc[s]) acc[s] = [];
      acc[s].push(m);
      return acc;
    },
    {}
  );

  const stageOrder = ["round_of_16", "quarterfinal", "semifinal", "third_place", "final"];
  const final = knockoutByStage["final"]?.[0];

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
      <PageHeader
        title="World Cup 2026"
        subtitle="USA · Canada · Mexico — June–July 2026"
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <Trophy size={16} className="text-amber-400" />
          <span className="text-sm font-semibold text-amber-400">Tournament Complete</span>
        </div>
      </PageHeader>

      {/* Champion banner */}
      {final && (
        <div className="mb-8 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent p-6 flex items-center gap-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-500/40">
            <Trophy size={28} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-500 mb-1">World Cup 2026 Champion</p>
            <div className="flex items-center gap-3">
              <TeamBadge
                short_name={final.home_score > final.away_score ? (final.home_team?.short_name || "?") : (final.away_team?.short_name || "?")}
                color={final.home_score > final.away_score ? (final.home_team?.primary_color || "#666") : (final.away_team?.primary_color || "#666")}
                size="md"
              />
              <span className="text-2xl font-bold text-white">
                {final.home_score > final.away_score ? final.home_team?.name : final.away_team?.name}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Final: {final.home_team?.name} {final.home_score}–{final.away_score} {final.away_team?.name} · {formatDate(final.match_date)}</p>
          </div>
        </div>
      )}

      {/* Group Stage */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Users size={18} className="text-accent" /> Group Stage
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(groups.data || []).map((g) => (
            <GroupTable key={g.name} group={g} />
          ))}
        </div>
      </section>

      {/* Knockout Rounds */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Trophy size={18} className="text-accent" /> Knockout Rounds
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {stageOrder.filter((s) => knockoutByStage[s]?.length).map((stage) => (
            <div key={stage} className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                {STAGE_LABELS[stage] || stage}
              </p>
              {knockoutByStage[stage].map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Top Scorers */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Target size={18} className="text-accent" /> Golden Boot Race
        </h2>
        <div className="card p-6">
          <div className="space-y-2">
            {(scorers.data || []).map((player, i) => (
              <Link
                key={player.id}
                to={`/players/${player.id}`}
                className="flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-base-700/50 group"
              >
                <span className="font-mono text-sm w-6 text-center shrink-0">
                  {i === 0 ? (
                    <span className="text-amber-400 font-bold">1</span>
                  ) : (
                    <span className="text-slate-500">{i + 1}</span>
                  )}
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-base-700 text-sm font-semibold text-slate-300 shrink-0">
                  {(player.name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white group-hover:text-accent transition-colors truncate">{player.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {player.team && (
                      <TeamBadge short_name={player.team.short_name} color={player.team.primary_color} size="sm" />
                    )}
                    <p className="text-xs text-slate-500">{player.position}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-lg font-bold text-white">{player.goals}</p>
                  <p className="text-xs text-slate-500">{player.assists}A · {player.appearances}GP</p>
                </div>
                <span
                  className="font-mono text-sm font-semibold w-10 text-right shrink-0"
                  style={{ color: ratingColor(player.rating) }}
                >
                  {player.rating.toFixed(1)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
