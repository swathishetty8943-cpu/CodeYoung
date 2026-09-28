import { useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useAdminAuth } from '../context/AdminAuthContext';
import { authApi, getErrorMessage } from '../services/api';

/**
 * Lets the admin rotate their own password (the seeded default,
 * admin@coach.edu / @admin123, is meant to be changed here after first
 * login). Uses the shared PATCH /api/auth/change-password endpoint.
 */
export default function SettingsPage() {
  const { admin } = useAdminAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setSaving(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setSuccess('Password updated. Use your new password next time you log in.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not update password.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">Manage your admin account.</p>

      <div className="card" style={{ maxWidth: 480, marginBottom: 24 }}>
        <div className="settings-account-row">
          <div className="avatar-circle avatar-lg">{(admin?.name || 'A').charAt(0)}</div>
          <div>
            <div style={{ fontWeight: 700 }}>{admin?.name}</div>
            <div style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>{admin?.email}</div>
          </div>
        </div>
      </div>

      <form className="card" style={{ maxWidth: 480 }} onSubmit={handleSubmit}>
        <h3 style={{ marginTop: 0 }}>Change password</h3>
        <p className="page-subtitle" style={{ marginBottom: 20 }}>
          The default seeded password should be changed after your first login.
        </p>

        {error && <div className="error-banner">{error}</div>}
        {success && <div className="success-banner">{success}</div>}

        <div className="form-group">
          <label htmlFor="currentPassword">Current password</label>
          <input
            id="currentPassword"
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="newPassword">New password</label>
          <input
            id="newPassword"
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm new password</label>
          <input
            id="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Update Password'}
        </button>
      </form>
    </AdminLayout>
  );
}
