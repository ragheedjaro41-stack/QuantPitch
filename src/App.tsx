import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Teams from "./pages/Teams";
import TeamDetail from "./pages/TeamDetail";
import Players from "./pages/Players";
import PlayerDetail from "./pages/PlayerDetail";
import Matches from "./pages/Matches";
import MatchDetail from "./pages/MatchDetail";
import WorldCup from "./pages/WorldCup";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminLeagues from "./pages/admin/Leagues";
import AdminTeams from "./pages/admin/Teams";
import AdminCups from "./pages/admin/Cups";
import AdminTiers from "./pages/admin/Tiers";
import AdminCoverage from "./pages/admin/Coverage";
import ThinLeagues from "./pages/admin/ThinLeagues";
import MissingData from "./pages/admin/MissingData";
import PromotionRelegation from "./pages/admin/PromotionRelegation";
import CupFixtures from "./pages/admin/CupFixtures";
import AuditReport from "./pages/admin/AuditReport";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="teams" element={<Teams />} />
        <Route path="teams/:id" element={<TeamDetail />} />
        <Route path="players" element={<Players />} />
        <Route path="players/:id" element={<PlayerDetail />} />
        <Route path="matches" element={<Matches />} />
        <Route path="matches/:id" element={<MatchDetail />} />
        <Route path="world-cup" element={<WorldCup />} />
        {/* Admin */}
        <Route path="admin" element={<AdminDashboard />} />
        <Route path="admin/leagues" element={<AdminLeagues />} />
        <Route path="admin/teams" element={<AdminTeams />} />
        <Route path="admin/cups" element={<AdminCups />} />
        <Route path="admin/tiers" element={<AdminTiers />} />
        <Route path="admin/coverage" element={<AdminCoverage />} />
        <Route path="admin/thin-leagues" element={<ThinLeagues />} />
        <Route path="admin/missing-data" element={<MissingData />} />
        <Route path="admin/promotion-relegation" element={<PromotionRelegation />} />
        <Route path="admin/cup-fixtures" element={<CupFixtures />} />
        <Route path="admin/audit" element={<AuditReport />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
