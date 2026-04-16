import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen bg-black-bg text-gold">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}
