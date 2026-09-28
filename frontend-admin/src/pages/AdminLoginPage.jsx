import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Check, AlertTriangle } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { getErrorMessage } from '../services/api';

export default function AdminLoginPage() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login({ email, password });
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not log in.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <div className="auth-visual-inner">
          <div className="badge-pill"><Wrench size={14} /> Admin Console</div>
          <h2>Run the CodeYoung platform</h2>
          <p>Manage mentors, review bookings, and tune platform-wide settings from one place.</p>
          <ul className="auth-visual-list">
            <li><span className="check"><Check size={12} strokeWidth={3} /></span> Add and manage mentor accounts</li>
            <li><span className="check"><Check size={12} strokeWidth={3} /></span> Configure business hours &amp; blackout dates</li>
            <li><span className="check"><Check size={12} strokeWidth={3} /></span> See every booking across the platform</li>
          </ul>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-card card">
          <h1>Admin Login</h1>
          <p className="subtitle">CodeYoung platform administration.</p>

          {error && (
            <div className="error-banner">
              <AlertTriangle size={16} style={{ flex: 'none', marginTop: 2 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
              {submitting ? 'Logging in…' : 'Log In'}
            </button>
          </form>

          <p style={{ marginTop: 20, fontSize: '0.82rem', textAlign: 'center', color: 'var(--color-muted)' }}>
            Default seeded login: admin@coach.edu — change the password from Settings after first login.
          </p>
        </div>
      </div>
    </div>
  );
}
