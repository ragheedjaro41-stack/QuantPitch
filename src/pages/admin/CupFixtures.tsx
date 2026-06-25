import { useState } from "react";
import { useAdminCups, useAllCupFixtures } from "../../lib/adminHooks";
import { PageHeader, Spinner, ErrorState } from "../../components/ui";
import { Link2, CircleAlert as AlertCircle, CircleCheck as CheckCircle } from "lucide-react";
import { formatDate } from "../../lib/utils";

function ScoreBadge({ home, away, et, pen, went_et, went_pen, winner }:
  { home: number | null; away: number | null; et: boolean; pen: boolean; went_et: boolean; went_pen: boolean; winner?: string | null }) {
  if (home === null || away === null) return <span className="text-xs text-slate-600">TBD</span>;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-base-700/80">
        <span className={`font-mono text-base font-bold ${home > away ? "text-white" : "text-slate-400"}`}>{home}</span>
        <span className="text-slate-600 text-xs">–</span>
        <span className={`font-mono text-base font-bold ${away > home ? "text-white" : "text-slate-400"}`}>{away}</span>
      </div>
      <div className="flex gap-1">
        {went_et && <span className="badge bg-warn/10 text-warn text-xs">AET</span>}
        {went_pen && <span className="badge bg-accent/10 text-accent text-xs">PEN</span>}
      </div>
    </div>
  );
}

export default function CupFixtures() {
  const { data: cups } = useAdminCups();
  const { data: fixtures, isLoading, isError } = useAllCupFixtures();
  const [selectedCup, setSelectedCup] = useState<string>("all");
  const [selectedRound, setSelectedRound] = useState<string>("all");

  const allFixtures = fixtures || [];
  const filteredByCup = selectedCup === "all" ? allFixtures : allFixtures.filter((f: any) => f.cup_id === selectedCup);

  const rounds = [...new Set(filteredByCup.map((f: any) => f.round_name))].sort();
  const filtered = selectedRound === "all" ? filteredByCup : filteredByCup.filter((f: any) => f.round_name === selectedRound);

  const twoLeg = filtered.filter((f: any) => f.leg === 2 || f.home_agg !== null);
  const withET = filtered.filter((f: any) => f.went_to_et);
  const withPens = filtered.filter((f: any) => f.went_to_penalties);
  const neutral = filtered.filter((f: any) => f.is_neutral_venue);

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
      <PageHeader title="Cup Fixtures" subtitle="Knockout and group stage fixture browser" />

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Fixtures", value: filtered.length, color: "#00D4FF" },
          { label: "Two-Leg Ties", value: twoLeg.length, color: "#a78bfa" },
          { label: "Went to AET", value: withET.length, color: "#fbbf24" },
          { label: "Penalties", value: withPens.length, color: "#f87171" },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">{s.label}</p>
            <p className="font-mono text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => { setSelectedCup("all"); setSelectedRound("all"); }}
            className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${selectedCup === "all" ? "bg-accent text-base-900" : "bg-base-700/50 text-slate-400 hover:text-white"}`}
          >
            All Cups
          </button>
          {(cups || []).filter((c) => allFixtures.some((f: any) => f.cup_id === c.id)).map((c) => (
            <button
              key={c.id}
              onClick={() => { setSelectedCup(c.id); setSelectedRound("all"); }}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${selectedCup === c.id ? "bg-accent text-base-900" : "bg-base-700/50 text-slate-400 hover:text-white"}`}
            >
              {c.short_name}
            </button>
          ))}
        </div>
        {selectedCup !== "all" && (
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setSelectedRound("all")}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${selectedRound === "all" ? "bg-accent/80 text-base-900" : "bg-base-700/50 text-slate-400 hover:text-white"}`}
            >
              All Rounds
            </button>
            {rounds.map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRound(r)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${selectedRound === r ? "bg-accent/80 text-base-900" : "bg-base-700/50 text-slate-400 hover:text-white"}`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? <Spinner /> : isError ? <ErrorState message="Failed to load cup fixtures" /> : (
        <div className="space-y-2">
          {filtered.map((f: any) => {
            const cup = f.cup;
            return (
              <div key={f.id} className="card p-4 flex items-center gap-4">
                {/* Cup + Round */}
                <div className="w-28 shrink-0">
                  <p className="text-xs font-bold text-slate-300">{cup?.short_name || "?"}</p>
                  <p className="text-xs text-slate-500">{f.round_name}</p>
                  {f.leg > 1 && (
                    <span className="badge bg-accent/10 text-accent text-xs mt-1 flex items-center gap-1">
                      <Link2 size={9} /> Leg {f.leg}
                    </span>
                  )}
                </div>

                {/* Match */}
                <div className="flex-1 flex items-center justify-center gap-4 min-w-0">
                  <div className="flex-1 text-right min-w-0">
                    <span className={`text-sm font-medium truncate block ${f.winner_name === f.home_team_name ? "text-white" : "text-slate-400"}`}>
                      {f.home_team_name || "TBD"}
                    </span>
                    {f.home_agg !== null && (
                      <span className="text-xs text-slate-600">Agg: {f.home_agg}</span>
                    )}
                  </div>
                  <ScoreBadge
                    home={f.home_score}
                    away={f.away_score}
                    et={f.home_score_et}
                    pen={f.home_score_pen}
                    went_et={f.went_to_et}
                    went_pen={f.went_to_penalties}
                    winner={f.winner_name}
                  />
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium truncate block ${f.winner_name === f.away_team_name ? "text-white" : "text-slate-400"}`}>
                      {f.away_team_name || "TBD"}
                    </span>
                    {f.away_agg !== null && (
                      <span className="text-xs text-slate-600">Agg: {f.away_agg}</span>
                    )}
                  </div>
                </div>

                {/* Meta */}
                <div className="w-36 text-right shrink-0">
                  {f.match_date && <p className="text-xs text-slate-500">{formatDate(f.match_date)}</p>}
                  {f.venue && <p className="text-xs text-slate-600 truncate">{f.venue}</p>}
                  <div className="flex justify-end gap-1 mt-1">
                    {f.is_neutral_venue && (
                      <span className="badge bg-slate-700/50 text-slate-400 text-xs">Neutral</span>
                    )}
                    {f.winner_name && (
                      <span className="flex items-center gap-1 text-xs text-good">
                        <CheckCircle size={10} /> {(f.winner_name || "").split(" ").slice(-1)[0] || "—"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="card p-8 text-center">
              <AlertCircle size={32} className="text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No fixtures found for this selection</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
