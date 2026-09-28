import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function ProtectedRoute({ children }) {
  const { admin, loading } = useAdminAuth();

  if (loading) return <div className="loading-spinner">Loading…</div>;
  if (!admin) return <Navigate to="/login" replace />;

  return children;
}
