import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Mail, Check, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../services/api';
import Navbar from '../components/Navbar';

const CODE_LENGTH = 4;
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyOtpPage() {
  const { verifySignupOtp, resendSignupOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // The email is handed off via router state from SignupPage. If someone
  // lands here directly (refresh, back button) with no email in state,
  // there's nothing to verify - send them back to start over.
  const email = location.state?.email || '';

  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) return;
    inputRefs.current[0]?.focus();
  }, [email]);

  // Ticks the resend cooldown down to 0 every second.
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!email) {
    return (
      <div>
        <Navbar />
        <div className="auth-page">
          <div className="auth-form-side" style={{ width: '100%' }}>
            <div className="auth-card card">
              <h1>Nothing to verify</h1>
              <p className="subtitle">
                We couldn't find a signup in progress. Please sign up again.
              </p>
              <Link to="/signup" className="btn btn-primary" style={{ width: '100%', display: 'block', textAlign: 'center' }}>
                Back to sign up
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleDigitChange = (index, rawValue) => {
    const value = rawValue.replace(/\D/g, '');
    setError('');

    if (value.length > 1) {
      // Handles pasting the whole code into one box.
      const pasted = value.slice(0, CODE_LENGTH).split('');
      const next = Array(CODE_LENGTH).fill('');
      pasted.forEach((d, i) => {
        next[i] = d;
      });
      setDigits(next);
      const lastFilledIndex = Math.min(pasted.length, CODE_LENGTH) - 1;
      inputRefs.current[lastFilledIndex]?.focus();
      return;
    }

    const next = [...digits];
    next[index] = value;
    setDigits(next);

    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    const code = digits.join('');
    if (code.length !== CODE_LENGTH) {
      setError(`Please enter all ${CODE_LENGTH} digits.`);
      return;
    }

    setVerifying(true);
    try {
      await verifySignupOtp({ email, code });
      navigate('/parent/dashboard?tab=book');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not verify that code.'));
      setDigits(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setInfo('');
    setResending(true);
    try {
      await resendSignupOtp({ email });
      setInfo('A new code has been sent to your email.');
      setDigits(Array(CODE_LENGTH).fill(''));
      setCooldown(RESEND_COOLDOWN_SECONDS);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not resend the code. Please try again.'));
    } finally {
      setResending(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="auth-page">
        <div className="auth-visual">
          <div className="auth-visual-inner">
            <div className="badge-pill"><Mail size={14} /> Almost there</div>
            <h2>Check your inbox</h2>
            <p>We just need to confirm this email address is really yours.</p>
            <ul className="auth-visual-list">
              <li><span className="check"><Check size={12} strokeWidth={3} /></span> Keeps your account secure</li>
              <li><span className="check"><Check size={12} strokeWidth={3} /></span> Only takes a few seconds</li>
              <li><span className="check"><Check size={12} strokeWidth={3} /></span> Didn't get it? You can resend below</li>
            </ul>
          </div>
        </div>

        <div className="auth-form-side">
          <div className="auth-card card">
            <h1>Enter verification code</h1>
            <p className="subtitle">
              We sent a 4-digit code to <strong>{email}</strong>.
            </p>

            {error && (
              <div className="error-banner">
                <AlertTriangle size={16} style={{ flex: 'none', marginTop: 2 }} />
                {error}
              </div>
            )}
            {info && !error && <div className="success-banner">{info}</div>}

            <form onSubmit={handleVerify}>
              <div className="otp-input-group">
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={CODE_LENGTH}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    aria-label={`Digit ${index + 1}`}
                  />
                ))}
              </div>

              <p className="otp-meta">This code expires in 10 minutes.</p>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={verifying}>
                {verifying ? 'Verifying…' : 'Verify'}
              </button>
            </form>

            <div className="otp-resend-row">
              {cooldown > 0 ? (
                <span>Resend code in {cooldown}s</span>
              ) : (
                <button type="button" className="link-btn" onClick={handleResend} disabled={resending}>
                  {resending ? 'Sending…' : 'Resend code'}
                </button>
              )}
            </div>

            <p style={{ marginTop: 20, fontSize: '0.9rem', textAlign: 'center' }}>
              Wrong email? <Link to="/signup">Go back</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
