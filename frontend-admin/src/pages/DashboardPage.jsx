import { useEffect, useState } from 'react';
import { AlertTriangle, Calendar, GraduationCap, CheckCircle2, BarChart3 } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { adminApi, getErrorMessage } from '../services/api';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getStats()
      .then((res) => setStats(res.data.stats))
      .catch((err) => setError(getErrorMessage(err, 'Could not load stats.')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">A quick snapshot of platform activity.</p>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={16} style={{ flex: 'none', marginTop: 2 }} />
          {error}
        </div>
      )}
      {loading && <p>Loading…</p>}

      {stats && (
        <>
          <div className="stat-grid">
            <div className="card stat-card">
              <div className="stat-value">{stats.bookingsToday}</div>
              <div className="stat-label"><Calendar size={14} /> Bookings Today</div>
            </div>
            <div className="card stat-card">
              <div className="stat-value">{stats.totalActiveMentors}</div>
              <div className="stat-label"><GraduationCap size={14} /> Active Mentors</div>
            </div>
            <div className="card stat-card">
              <div className="stat-value">{stats.totalConfirmedBookings}</div>
              <div className="stat-label"><CheckCircle2 size={14} /> Total Confirmed Bookings</div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Mentor Utilization (last 30 days)</h3>
            {stats.mentorUtilizationLast30Days.length === 0 ? (
              <p className="empty-state">
                <span className="empty-icon"><BarChart3 size={34} /></span>
                No bookings in the last 30 days.
              </p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mentor</th>
                    <th>Classes</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.mentorUtilizationLast30Days.map((row) => (
                    <tr key={row._id}>
                      <td style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="avatar-circle" style={{ width: 30, height: 30, fontSize: '0.75rem' }}>
                          {row.mentorName?.charAt(0)}
                        </span>
                        {row.mentorName}
                      </td>
                      <td>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  );
}
