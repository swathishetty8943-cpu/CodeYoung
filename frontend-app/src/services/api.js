import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // send/receive the httpOnly JWT cookie
  headers: { 'Content-Type': 'application/json' },
});

// If a request fails auth (expired/invalid session), let callers handle
// the redirect via AuthContext rather than forcing a hard reload here.
export function isAuthError(err) {
  return err?.response?.status === 401;
}

export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  return err?.response?.data?.message || fallback;
}

export const authApi = {
  // Starts email-verification signup - does NOT log the user in. Returns
  // { email, expiresInMinutes }.
  signup: (data) => api.post('/auth/signup', data),
  verifySignupOtp: (data) => api.post('/auth/signup/verify-otp', data),
  resendSignupOtp: (data) => api.post('/auth/signup/resend-otp', data),
  login: (data) => api.post('/auth/login', data),
  googleAuth: (data) => api.post('/auth/google', data),
  // First-time country prompt for parents who signed up with Google.
  setCountry: (data) => api.patch('/auth/country', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.patch('/auth/change-password', data),
};

export const mentorApi = {
  getAvailability: (date, timezone) =>
    api.get('/mentors/availability', { params: { date, timezone } }),
};

export const bookingApi = {
  create: (data) => api.post('/bookings', data),
  getMine: () => api.get('/bookings/me'),
  cancel: (id) => api.patch(`/bookings/${id}/cancel`),
};

export default api;