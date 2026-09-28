import { useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import { AlertTriangle, Inbox } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { adminApi, getErrorMessage } from '../services/api';

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .listAllBookings()
      .then((res) => setBookings(res.data.bookings))
      .catch((err) => setError(getErrorMessage(err, 'Could not load bookings.')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <h1 className="page-title">All Bookings</h1>
      <p className="page-subtitle">Platform-wide view for support and debugging (most recent first).</p>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={16} style={{ flex: 'none', marginTop: 2 }} />
          {error}
        </div>
      )}

      <div className="card">
        {loading ? (
          <p>Loading…</p>
        ) : bookings.length === 0 ? (
          <p className="empty-state">
            <span className="empty-icon"><Inbox size={34} /></span>
            No bookings yet.
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Parent's Local Time</th>
                <th>Mentor's Local Time</th>
                <th>Type</th>
                <th>Parent</th>
                <th>Mentor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b._id}>
                  <td>
                    {b.parentId?.timezone
                      ? DateTime.fromISO(b.startTimeUTC, { zone: 'utc' })
                          .setZone(b.parentId.timezone)
                          .toFormat("MMM d, h:mm a ZZZZ")
                      : '—'}
                  </td>
                  <td>
                    {b.mentorId?.timezone
                      ? DateTime.fromISO(b.startTimeUTC, { zone: 'utc' })
                          .setZone(b.mentorId.timezone)
                          .toFormat("MMM d, h:mm a ZZZZ")
                      : '—'}
                  </td>
                  <td>{b.bookingType === 'full_coaching' ? 'Full Coaching' : 'Free Trial'}</td>
                  <td>{b.parentId?.name} ({b.parentId?.email})</td>
                  <td>{b.mentorId?.name} ({b.mentorId?.email})</td>
                  <td>
                    <span
                      className={`badge ${b.status === 'confirmed' ? 'badge-active' : 'badge-inactive'}`}
                    >
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
