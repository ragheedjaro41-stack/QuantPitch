import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Shield, Users, Trophy, Globe } from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/teams", label: "Teams", icon: Shield, end: false },
  { to: "/players", label: "Players", icon: Users, end: false },
  { to: "/matches", label: "Matches", icon: Trophy, end: false },
  { to: "/world-cup", label: "World Cup", icon: Globe, end: false },
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

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `nav-link ${isActive ? "nav-link-active" : ""}`
              }
            >
              <item.icon className="h-4.5 w-4.5" size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-6 py-4 border-t border-base-700">
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
