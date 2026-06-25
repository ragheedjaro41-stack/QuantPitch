import { Link } from "react-router-dom";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  accent = "#00D4FF",
}: {
  label: string;
  value: string | number;
  icon?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="card card-hover p-5">
      <div className="flex items-center justify-between">
        <span className="stat-label">{label}</span>
        {icon && (
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${accent}15`, color: accent }}
          >
            {icon}
          </div>
        )}
      </div>
      <p className="stat-value mt-3" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-base-600 border-t-accent" />
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-sm text-bad">{message}</p>
    </div>
  );
}

export function TeamBadge({
  short_name,
  color,
  size = "md",
  logo_url,
}: {
  short_name: string;
  color: string;
  size?: "sm" | "md" | "lg";
  logo_url?: string | null;
}) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-16 w-16 text-lg",
  };
  const imgSizes = { sm: 24, md: 32, lg: 52 };
  return (
    <div
      className={`flex items-center justify-center rounded-xl font-mono font-bold ${sizes[size]}`}
      style={{
        backgroundColor: `${color}20`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {logo_url ? (
        <img
          src={logo_url}
          alt={short_name}
          width={imgSizes[size]}
          height={imgSizes[size]}
          className="object-contain"
          loading="lazy"
        />
      ) : (
        short_name
      )}
    </div>
  );
}

export function LeagueSelector({
  leagues,
  selected,
  onChange,
  showStatus = false,
  getStatus,
}: {
  leagues: { id: string; name: string; short_name: string; tier: number }[];
  selected: string | null;
  onChange: (id: string | null) => void;
  showStatus?: boolean;
  getStatus?: (l: { id: string }) => string;
}) {
  const grouped = new Map<number, typeof leagues>();
  for (const l of leagues) {
    const arr = grouped.get(l.tier) ?? [];
    arr.push(l);
    grouped.set(l.tier, arr);
  }
  const tierLabels: Record<number, string> = { 1: "Tier 1", 2: "Tier 2", 3: "Tier 3", 4: "Tier 4" };

  return (
    <div className="relative">
      <select
        value={selected ?? "__all__"}
        onChange={(e) => onChange(e.target.value === "__all__" ? null : e.target.value)}
        className="input pl-4 pr-8 py-2.5 min-w-[200px] appearance-none text-sm font-medium"
      >
        <option value="__all__">All Leagues</option>
        {[...grouped.entries()].sort(([a], [b]) => a - b).map(([tier, items]) => (
          <optgroup key={tier} label={tierLabels[tier] ?? `Tier ${tier}`}>
            {items.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}{showStatus && getStatus ? ` [${getStatus(l)}]` : ""}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
      </svg>
    </div>
  );
}

export function LeagueStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { cls: string }> = {
    "LIVE READY": { cls: "bg-good/10 text-good border-good/30" },
    "BLOCKED": { cls: "bg-slate-700/50 text-slate-400 border-slate-600" },
    "THIN": { cls: "bg-warn/10 text-warn border-warn/30" },
    "MISSING DATA": { cls: "bg-bad/10 text-bad border-bad/30" },
  };
  const c = cfg[status] ?? cfg["BLOCKED"];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${c.cls}`}>
      {status}
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="btn-ghost mb-6 -ml-2">
      <span className="text-base">←</span>
      {label}
    </Link>
  );
}
