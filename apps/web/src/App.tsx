import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { AppShell } from './components/AppShell';

import Login from './pages/auth/LoginPage';
import KookCallbackPage from './pages/auth/KookCallbackPage';
import Dashboard from './pages/dashboard/DashboardPage';
import GuildDashboard from './pages/guild-dashboard/GuildDashboardPage';
import BattleReportDetail from './pages/battle-report/BattleReportDetailPage';
import Guilds from './pages/guilds/GuildsPage';
import Profile from './pages/profile/ProfilePage';
import Admin from './pages/admin/AdminPage';
import Settings from './pages/settings/SettingsPage';
import GameDataTestPage from './pages/test/GameDataTestPage';
import KookMessageBrowserPage from './pages/test/KookMessageBrowserPage';
import { ToastProvider } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/Confirm';

export default function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/oauth/kook/callback" element={<KookCallbackPage />} />
            <Route path="/" element={<ProtectedRoute><AppShell><Dashboard /></AppShell></ProtectedRoute>} />
            <Route path="/guild-dashboard" element={<ProtectedRoute><AppShell><GuildDashboard /></AppShell></ProtectedRoute>} />
            <Route path="/battles/:ids" element={<ProtectedRoute><AppShell><BattleReportDetail /></AppShell></ProtectedRoute>} />
            <Route path="/guilds" element={<ProtectedRoute><AppShell><Guilds /></AppShell></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><AppShell><Profile /></AppShell></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><AppShell><Settings /></AppShell></ProtectedRoute>} />
            <Route path="/test/game-data" element={<ProtectedRoute><AppShell><GameDataTestPage /></AppShell></ProtectedRoute>} />
            <Route path="/test/kook-messages" element={<ProtectedRoute><AppShell><KookMessageBrowserPage /></AppShell></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><AppShell><Admin /></AppShell></AdminRoute>} />
          </Routes>
        </Router>
      </ConfirmProvider>
    </ToastProvider>
  );
}
