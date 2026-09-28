import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { AlertTriangle } from 'lucide-react';
import { auth, googleProvider, firebaseConfigured } from '../config/firebase';
import GoogleLogo from './icons/GoogleLogo';

/**
 * Renders a "Continue with Google" button backed by Firebase Auth. On
 * click, opens Google's account picker via signInWithPopup, then forwards
 * the resulting Firebase ID token to `onCredential` - the backend verifies
 * it with firebase-admin (see backend/src/config/googleAuth.js) and treats
 * it exactly like it used to treat a raw Google ID token.
 *
 * If Firebase hasn't been configured yet (see src/config/firebase.js),
 * renders a disabled placeholder instead of silently failing, so it's
 * obvious in dev that setup is incomplete.
 */
export default function GoogleSignInButton({ onCredential }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClick = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      await onCredential(idToken);
    } catch (err) {
      // Common case: user just closed the popup - don't show that as an error.
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        setError('Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!firebaseConfigured) {
    return (
      <button className="btn btn-google" disabled title="Fill in src/config/firebase.js to enable">
        <GoogleLogo />
        Continue with Google (not configured)
      </button>
    );
  }

  return (
    <div>
      <button type="button" className="btn btn-google" onClick={handleClick} disabled={loading} style={{ width: '100%' }}>
        <GoogleLogo />
        {loading ? 'Opening Google sign-in…' : 'Continue with Google'}
      </button>
      {error && (
        <div className="error-banner" style={{ marginTop: 8 }}>
          <AlertTriangle size={16} style={{ flex: 'none', marginTop: 2 }} />
          {error}
        </div>
      )}
    </div>
  );
}
