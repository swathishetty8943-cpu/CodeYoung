import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On first load, try to restore a session from the httpOnly cookie.
  useEffect(() => {
    let cancelled = false;
    authApi
      .me()
      .then((res) => {
        if (!cancelled) setUser(res.data.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Starts the email-verification signup flow. Does NOT set `user` - no
  // account exists yet, so there's nothing to log in as. Returns
  // { email, expiresInMinutes } for the caller to hand off to the OTP page.
  const signup = useCallback(async (payload) => {
    const res = await authApi.signup(payload);
    return res.data;
  }, []);

  // Completes signup: on a correct code, the backend creates the account
  // and sets the session cookie, so this is the point `user` gets set.
  const verifySignupOtp = useCallback(async (payload) => {
    const res = await authApi.verifySignupOtp(payload);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const resendSignupOtp = useCallback(async (payload) => {
    const res = await authApi.resendSignupOtp(payload);
    return res.data;
  }, []);

  const login = useCallback(async (payload) => {
    const res = await authApi.login(payload);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const googleAuth = useCallback(async (payload) => {
    const res = await authApi.googleAuth(payload);
    setUser(res.data.user);
    return res.data;
  }, []);

  // Saves the country a Google-signup parent is asked for on first visit.
  // The backend returns the updated user (needsCountry now false), which is
  // what makes the prompt disappear.
  const setCountry = useCallback(async (payload) => {
    const res = await authApi.setCountry(payload);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  // Works for any role. The backend returns the updated user (with
  // mustResetPassword now false), so we refresh context state from the
  // response rather than needing a follow-up /me call.
  const changePassword = useCallback(async (payload) => {
    const res = await authApi.changePassword(payload);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signup,
        verifySignupOtp,
        resendSignupOtp,
        login,
        googleAuth,
        setCountry,
        logout,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}