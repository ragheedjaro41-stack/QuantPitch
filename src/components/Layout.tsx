import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Shield, Users, Trophy, Globe, Settings, ChartBar as BarChart2, Database, TriangleAlert as AlertTriangle, ArrowUpDown, ClipboardList, Tag, BadgeCheck } from "lucide-react";

const mainNav = [
  { to: "/",          label: "Dashboard",  icon: LayoutDashboard, end: true },
  { to: "/teams",     label: "Teams",      icon: Shield,          end: false },
  { to: "/players",   label: "Players",    icon: Users,           end: false },
  { to: "/matches",   label: "Matches",    icon: Trophy,          end: false },
  { to: "/world-cup", label: "World Cup",  icon: Globe,           end: false },
];

const adminNav = [
  { to: "/admin",                      label: "Overview",        icon: Settings },
  { to: "/admin/leagues",              label: "Leagues",         icon: Globe },
  { to: "/admin/tiers",                label: "Tiers",           icon: BarChart2 },
  { to: "/admin/cups",                 label: "Cups",            icon: Trophy },
  { to: "/admin/cup-fixtures",         label: "Cup Fixtures",    icon: Trophy },
  { to: "/admin/coverage",             label: "Data Coverage",   icon: Database },
  { to: "/admin/thin-leagues",         label: "Thin Leagues",    icon: AlertTriangle },
  { to: "/admin/missing-data",         label: "Provider Gaps",   icon: AlertTriangle },
  { to: "/admin/teams",                label: "Teams",           icon: Shield },
  { to: "/admin/promotion-relegation", label: "P/R Tracker",     icon: ArrowUpDown },
  { to: "/admin/audit",                label: "Audit Report",    icon: ClipboardList },
  { to: "/admin/alias-queue",          label: "Alias Queue",     icon: Tag },
  { to: "/admin/certification",        label: "Certification",   icon: BadgeCheck },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-base-900">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-base-700 bg-base-800/95 backdrop-blur-md">
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 border border-accent/30">
            <span className="font-mono text-lg font-bold text-accent">Q</span>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white">QuantPitch</h1>
            <p className="text-xs text-slate-500">AI Soccer Analytics</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {mainNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}

          {/* Admin section divider */}
          <div className="pt-4 pb-1 px-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-600">Admin</p>
          </div>

          {adminNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/admin"}
              className={({ isActive }) => `nav-link text-xs py-2 ${isActive ? "nav-link-active" : ""}`}
            >
              <item.icon size={15} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-6 py-4 border-t border-base-700 shrink-0">
          <p className="text-xs text-slate-500">Season 2025 · WC 2026</p>
          <p className="text-xs text-slate-600 mt-0.5">22 teams · 156 players</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64">
        <Outlet />
      </main>
    </div>
  );
}
