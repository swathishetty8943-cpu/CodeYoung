import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  return err?.response?.data?.message || fallback;
}

export const authApi = {
  // Admin has its own login endpoint - no role toggle, since this whole
  // app is admin-only (spec section D). Admin accounts are pre-seeded,
  // never created via any public signup.
  login: (data) => api.post('/auth/admin-login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.patch('/auth/change-password', data),
};

export const adminApi = {
  listMentors: () => api.get('/admin/mentors'),
  createMentor: (data) => api.post('/admin/mentors', data),
  updateMentor: (id, data) => api.patch(`/admin/mentors/${id}`, data),
  getMentorSchedule: (id) => api.get(`/admin/mentors/${id}/schedule`),

  getConfig: () => api.get('/admin/config'),
  updateConfig: (data) => api.patch('/admin/config', data),

  listAllBookings: () => api.get('/admin/bookings'),
  getStats: () => api.get('/admin/stats'),
};

export default api;
