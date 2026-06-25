import { useState } from "react";
import { useAdminCups } from "../../lib/adminHooks";
import { PageHeader, Spinner, ErrorState } from "../../components/ui";
import { CircleCheck as CheckCircle, Circle as XCircle, Users, Link as LinkIcon } from "lucide-react";
import type { CupCompetition } from "../../lib/adminHooks";

const TYPE_LABELS: Record<string, string> = {
  cup: "Cup",
  continental: "Continental",
  international_tournament: "Tournament",
};

const TYPE_COLORS: Record<string, string> = {
  cup: "#00D4FF",
  continental: "#a78bfa",
  international_tournament: "#f472b6",
};

function CupCard({ cup }: { cup: CupCompetition }) {
  const typeColor = TYPE_COLORS[cup.competition_type] || "#64748b";
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{cup.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{cup.country} · {cup.current_season}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="badge text-xs" style={{ backgroundColor: `${typeColor}15`, color: typeColor, border: `1px solid ${typeColor}30` }}>
            {TYPE_LABELS[cup.competition_type] || cup.competition_type}
          </span>
          {cup.playable ? (
            <span className="flex items-center gap-1 text-xs text-good">
              <CheckCircle size={11} /> Playable
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-bad">
              <XCircle size={11} /> Blocked
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-base-700">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            {cup.has_fixtures ? <CheckCircle size={12} className="text-good" /> : <XCircle size={12} className="text-bad" />}
          </div>
          <p className="text-xs text-slate-500 mt-1">Fixtures</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            {cup.has_odds ? <CheckCircle size={12} className="text-good" /> : <XCircle size={12} className="text-bad" />}
          </div>
          <p className="text-xs text-slate-500 mt-1">Odds</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            {cup.has_stats ? <CheckCircle size={12} className="text-good" /> : <XCircle size={12} className="text-bad" />}
          </div>
          <p className="text-xs text-slate-500 mt-1">Stats</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-base-700">
        {cup.has_groups && (
          <span className="badge bg-base-700/50 text-slate-400 text-xs">
            <Users size={10} /> Groups
          </span>
        )}
        {cup.has_two_legs && (
          <span className="badge bg-base-700/50 text-slate-400 text-xs">
            <LinkIcon size={10} /> 2-Legs
          </span>
        )}
        <span className={`badge text-xs ${cup.provider_flag === "ok" ? "bg-good/10 text-good" : cup.provider_flag === "partial" ? "bg-warn/10 text-warn" : "bg-bad/10 text-bad"}`}>
          {cup.provider_flag}
        </span>
      </div>

      {cup.notes && (
        <p className="text-xs text-slate-500 mt-3 italic">{cup.notes}</p>
      )}
    </div>
  );
}

export default function AdminCups() {
  const { data, isLoading, isError } = useAdminCups();
  const [typeFilter, setTypeFilter] = useState("all");

  const types = ["all", "cup", "continental", "international_tournament"];

  const filtered = (data || []).filter((c) =>
    typeFilter === "all" || c.competition_type === typeFilter
  );

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
      <PageHeader title="Cup Competitions" subtitle={`${data?.length ?? 0} cup and tournament competitions`} />

      <div className="flex gap-2 mb-6 flex-wrap">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${typeFilter === t ? "bg-accent text-base-900" : "bg-base-700/50 text-slate-400 hover:text-white"}`}
          >
            {t === "all" ? "All" : TYPE_LABELS[t] || t}
          </button>
        ))}
      </div>

      {isLoading ? <Spinner /> : isError ? <ErrorState message="Failed to load cups" /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((cup) => <CupCard key={cup.id} cup={cup} />)}
        </div>
      )}
    </div>
  );
}
