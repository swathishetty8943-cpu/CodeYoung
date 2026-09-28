import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Gift, Check, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../services/api';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { detectBrowserTimezone } from '../utils/timezone';
import { COUNTRIES, getCountry, defaultTimezoneForCountry } from '../utils/countries';
import Navbar from '../components/Navbar';
import BackButton from '../components/BackButton';

export default function SignupPage() {
  const { signup, googleAuth } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Detected once and reused: it's both the fallback timezone for accounts
  // created via Google (no country step there) and the hint we use to
  // pre-select the right zone once a country is chosen below.
  const detectedZone = useMemo(() => detectBrowserTimezone(), []);

  // Country is required so we always have a real IANA timezone to store -
  // see backend/src/utils/timezone.js and utils/countries.js for why this
  // matters (mentors are usually in India, parents in the US/UK, but could
  // be anywhere, and every date shown or emailed is computed from this
  // value). Timezone starts empty and is only filled in once a country is
  // picked, so the form can't be submitted with a leftover default.
  const [country, setCountry] = useState('');
  const [timezone, setTimezone] = useState('');

  const timezoneOptions = country ? getCountry(country)?.timezones || [] : [];

  const handleCountryChange = (code) => {
    setCountry(code);
    setTimezone(defaultTimezoneForCountry(code, detectedZone));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!country) {
      setError('Please select your country.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      // No role field is ever sent - signup always creates a parent account.
      // This only starts email verification - no account exists yet, so we
      // route to the OTP entry page rather than the dashboard.
      await signup({
        name,
        email,
        password,
        country,
        timezone: timezone || defaultTimezoneForCountry(country, detectedZone),
      });
      navigate('/signup/verify', { state: { email } });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create your account.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleCredential = async (idToken) => {
    setError('');
    try {
      // Google sign-up is a one-click flow with no country step here, so we
      // start from the browser-detected zone. The parent dashboard then asks
      // for their country the first time they land on it (see
      // CountryPromptModal / user.needsCountry) and updates the timezone.
      await googleAuth({ idToken, timezone: detectedZone });
      navigate('/parent/dashboard?tab=book');
    } catch (err) {
      setError(getErrorMessage(err, 'Google sign-up failed.'));
    }
  };

  return (
    <div>
      <Navbar />
      <div className="auth-page">
        <div className="auth-visual">
          <div className="auth-visual-inner">
            <div className="badge-pill"><Gift size={14} /> Free trial classes included</div>
            <h2>Book your child's free coding trial</h2>
            <p>Create a parent account and get matched with a mentor in minutes.</p>
            <ul className="auth-visual-list">
              <li><span className="check"><Check size={12} strokeWidth={3} /></span> 100% free, no card required</li>
              <li><span className="check"><Check size={12} strokeWidth={3} /></span> Matched instantly with a real mentor</li>
              <li><span className="check"><Check size={12} strokeWidth={3} /></span> Confirmation + reminder emails included</li>
            </ul>
          </div>
        </div>

        <div className="auth-form-side">
          <div className="auth-card card">
            <BackButton />
            <h1>Book your free trial class</h1>
            <p className="subtitle">Create a parent account to get started.</p>

            {error && (
              <div className="error-banner">
                <AlertTriangle size={16} style={{ flex: 'none', marginTop: 2 }} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Your name</label>
                <input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
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
                <label htmlFor="country">Country</label>
                <select
                  id="country"
                  required
                  value={country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                >
                  <option value="" disabled>
                    Select your country
                  </option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="field-hint">
                  We use this to show class times in your local time.
                </p>
              </div>

              {timezoneOptions.length > 1 && (
                <div className="form-group">
                  <label htmlFor="timezone">Timezone</label>
                  <select
                    id="timezone"
                    required
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    {timezoneOptions.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm password</label>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
                {submitting ? 'Creating account…' : 'Sign Up'}
              </button>
            </form>

            <div className="divider">or</div>
            <GoogleSignInButton onCredential={handleGoogleCredential} />

            <p style={{ marginTop: 20, fontSize: '0.9rem', textAlign: 'center' }}>
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}