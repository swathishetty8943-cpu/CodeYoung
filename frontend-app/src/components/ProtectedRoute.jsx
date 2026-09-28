import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Wraps a page element and redirects to /login if there's no session, or
 * to the correct dashboard if the logged-in user's role doesn't match
 * `allowedRoles` (e.g. a mentor trying to open /parent/dashboard directly).
 *
 * Also enforces the forced password reset: if the account still has
 * `mustResetPassword` set (e.g. a mentor on their first login with the
 * admin-issued temp password), every route except /change-password itself
 * redirects there, so the rest of the app is unreachable until they set a
 * real password.
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="loading-spinner">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (user.mustResetPassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const fallback = user.role === 'mentor' ? '/mentor/dashboard' : '/parent/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return children;
}
