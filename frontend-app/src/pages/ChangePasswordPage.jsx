import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Check, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../services/api';
import Navbar from '../components/Navbar';
import BackButton from '../components/BackButton';

/**
 * Works for any authenticated role (parent, mentor, admin) since the
 * backend endpoint isn't role-restricted. Doubles as two flows:
 *
 * 1. Forced reset - a mentor's first login uses the admin-issued temp
 *    password (their own email), which sets mustResetPassword: true.
 *    ProtectedRoute redirects here before anything else is reachable, so
 *    the copy adapts and there's no "Back"/skip out of it.
 * 2. Voluntary change - reached from the navbar by an already-set-up
 *    account; behaves like a normal settings page.
 */
export default function ChangePasswordPage() {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();

  const forced = Boolean(user?.mustResetPassword);
  const dashboardPath = user?.role === 'mentor' ? '/mentor/dashboard' : '/parent/dashboard';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setSuccess(true);
      setTimeout(() => navigate(dashboardPath, { replace: true }), 1200);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not change your password.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="auth-page">
        <div className="auth-visual">
          <div className="auth-visual-inner">
            <div className="badge-pill"><KeyRound size={14} /> Account security</div>
            <h2>{forced ? 'Set a password of your own' : 'Keep your account secure'}</h2>
            <p>
              {forced
                ? "You're currently signed in with a temporary password. Choose a new one to continue."
                : 'Update your password any time - you\u2019ll need your current one to confirm it\u2019s you.'}
            </p>
          </div>
        </div>

        <div className="auth-form-side">
          <div className="auth-card card">
            {!forced && <BackButton fallback={dashboardPath} />}
            <h1>{forced ? 'Set a new password' : 'Change password'}</h1>
            <p className="subtitle">
              {forced
                ? 'For security, you must set a new password before continuing to your dashboard.'
                : 'Enter your current password and choose a new one.'}
            </p>

            {error && (
              <div className="error-banner">
                <AlertTriangle size={16} style={{ flex: 'none', marginTop: 2 }} />
                {error}
              </div>
            )}
            {success && (
              <div className="success-banner">
                <Check size={16} style={{ flex: 'none', marginTop: 2 }} />
                Password updated. Redirecting…
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="currentPassword">Current password</label>
                <input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="newPassword">New password</label>
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm new password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={submitting || success}
              >
                {submitting ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
