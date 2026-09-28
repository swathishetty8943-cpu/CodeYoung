import { useEffect, useState, useCallback, useMemo } from 'react';
import { DateTime } from 'luxon';
import { AlertTriangle, GraduationCap } from 'lucide-react';
import Navbar from '../components/Navbar';
import BookingList from '../components/BookingList';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { bookingApi, getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function MentorDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('upcoming');
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await bookingApi.getMine();
      setUpcoming(res.data.upcoming);
      setPast(res.data.past);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load your classes.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // Purely a display convenience: how many of the upcoming classes fall on
  // the mentor's own local "today", out of their 2-per-day slot cap. Must
  // compare calendar dates in the mentor's own IANA zone, not UTC or the
  // browser's zone - a class at 11pm US time can already be "tomorrow" in
  // Asia/Kolkata.
  const todayCount = useMemo(() => {
    const todayLocal = DateTime.now().setZone(user.timezone).toFormat('yyyy-MM-dd');
    return upcoming.filter((b) => {
      const startLocal = DateTime.fromISO(b.startTimeUTC, { zone: 'utc' }).setZone(user.timezone);
      return startLocal.toFormat('yyyy-MM-dd') === todayLocal;
    }).length;
  }, [upcoming, user.timezone]);

  return (
    <div>
      <Navbar />
      <div className="container dashboard-container">
        <div className="dashboard-hero">
          <div>
            <h1>
              Welcome, {user.name} <GraduationCap size={26} style={{ verticalAlign: 'text-bottom' }} />
            </h1>
            <p>Your assigned trial classes are shown below in your local time ({user.timezone}).</p>
          </div>
          <div className="dashboard-hero-stats">
            <div className="dashboard-hero-stat">
              <div className="value">{upcoming.length}</div>
              <div className="label">Upcoming</div>
            </div>
            <div className="dashboard-hero-stat">
              <div className="value">{past.length}</div>
              <div className="label">Completed</div>
            </div>
            <div className="dashboard-hero-stat">
              <div className="value">{todayCount}</div>
              <div className="label">Booked Today (your time)</div>
            </div>
          </div>
        </div>

        <div className="dashboard-tabs">
          <button className={tab === 'upcoming' ? 'active' : ''} onClick={() => setTab('upcoming')}>
            Upcoming
          </button>
          <button className={tab === 'past' ? 'active' : ''} onClick={() => setTab('past')}>
            Past
          </button>
        </div>

        <div className="card">
          {error && (
            <div className="error-banner">
              <AlertTriangle size={16} style={{ flex: 'none', marginTop: 2 }} />
              {error}
            </div>
          )}
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <BookingList
              bookings={tab === 'upcoming' ? upcoming : past}
              perspective="mentor"
              viewerTimezone={user.timezone}
              showCancel={false}
              onChanged={loadBookings}
            />
          )}
        </div>
      </div>
    </div>
  );
}