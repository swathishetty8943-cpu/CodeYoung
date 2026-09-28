import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Check, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../services/api';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { detectBrowserTimezone } from '../utils/timezone';
import Navbar from '../components/Navbar';
import BackButton from '../components/BackButton';

export default function LoginPage() {
  const { login, googleAuth } = useAuth();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState('parent');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const routeAfterLogin = (user) => {
    navigate(user.role === 'mentor' ? '/mentor/dashboard' : '/parent/dashboard');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login({ email, password, selectedRole });
      routeAfterLogin(user);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not log in. Please check your details.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleCredential = async (idToken) => {
    setError('');
    try {
      const { user, isNewAccount } = await googleAuth({
        idToken,
        timezone: detectBrowserTimezone(),
      });
      // New Google users are always created as parents (mentors are never
      // self-service - see spec section B), so there's no role-confirmation
      // step needed here; existing accounts just log in as their stored role.
      routeAfterLogin(user);
      void isNewAccount;
    } catch (err) {
      setError(getErrorMessage(err, 'Google sign-in failed.'));
    }
  };

  return (
    <div>
      <Navbar />
      <div className="auth-page">
        <div className="auth-visual">
          <div className="auth-visual-inner">
            <div className="badge-pill"><LogIn size={14} /> Welcome back</div>
            <h2>Pick up right where you left off</h2>
            <p>Log in to view your trial class, join your session, or manage your bookings.</p>
            <ul className="auth-visual-list">
              <li><span className="check"><Check size={12} strokeWidth={3} /></span> See your upcoming and past trial classes</li>
              <li><span className="check"><Check size={12} strokeWidth={3} /></span> Join your class with one click</li>
              <li><span className="check"><Check size={12} strokeWidth={3} /></span> All times shown in your own timezone</li>
            </ul>
          </div>
        </div>

        <div className="auth-form-side">
          <div className="auth-card card">
            <BackButton />
            <h1>Welcome back</h1>
            <p className="subtitle">Log in to continue to your dashboard.</p>

            {error && (
              <div className="error-banner">
                <AlertTriangle size={16} style={{ flex: 'none', marginTop: 2 }} />
                {error}
              </div>
            )}

            <div className="role-toggle">
              <button
                type="button"
                className={selectedRole === 'parent' ? 'active' : ''}
                onClick={() => setSelectedRole('parent')}
              >
                I am a Parent
              </button>
              <button
                type="button"
                className={selectedRole === 'mentor' ? 'active' : ''}
                onClick={() => setSelectedRole('mentor')}
              >
                I am a Mentor
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-with-action">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-icon-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
                {submitting ? 'Logging in…' : 'Log In'}
              </button>
            </form>

            {selectedRole === 'parent' && (
              <>
                <div className="divider">or</div>
                <GoogleSignInButton onCredential={handleGoogleCredential} />
              </>
            )}

            <p style={{ marginTop: 20, fontSize: '0.9rem', textAlign: 'center' }}>
              New parent? <Link to="/signup">Sign up here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
