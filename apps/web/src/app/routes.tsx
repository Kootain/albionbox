import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AppShell } from '../layouts/AppShell';
import { AdminPage } from '../pages/AdminPage';
import { AuthPage } from '../pages/AuthPage';
import { DashboardPage } from '../pages/DashboardPage';
import { GuildsPage } from '../pages/GuildsPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProfilePage } from '../pages/ProfilePage';
import { RegearPage } from '../pages/RegearPage';

export const AppRoutes = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<AuthPage />} path="/auth" />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route element={<DashboardPage />} path="/" />
        <Route element={<GuildsPage />} path="/guilds" />
        <Route element={<RegearPage />} path="/regear" />
        <Route element={<ProfilePage />} path="/profile" />
        <Route element={<AdminPage />} path="/admin" />
        <Route element={<NotFoundPage />} path="*" />
      </Route>
    </Routes>
  </BrowserRouter>
);
