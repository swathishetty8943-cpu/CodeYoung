import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import Navbar from '../components/Navbar';
import SlotPicker from '../components/SlotPicker';
import BookingList from '../components/BookingList';
import LoadingSkeleton from '../components/LoadingSkeleton';
import CountryPromptModal from '../components/CountryPromptModal';
import { bookingApi, getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ParentDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  // The Book tab is always reachable now: Full Coaching can be booked
  // whether or not the family's free trials are used up, so we no longer
  // gate the tab itself on freeTrialsRemaining (SlotPicker handles the
  // trial-vs-coaching choice and any trials-exhausted messaging inside).
  const initialTab = searchParams.get('tab') === 'book' ? 'book' : 'upcoming';
  const [tab, setTab] = useState(initialTab);

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
      setError(getErrorMessage(err, 'Could not load your bookings.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const changeTab = (next) => {
    setTab(next);
    setSearchParams(next === 'book' ? { tab: 'book' } : {});
  };

  return (
    <div>
      <Navbar />
      {/* Parents who signed up with Google have no country yet - ask once. */}
      {user.needsCountry && <CountryPromptModal />}
      <div className="container dashboard-container">
        <div className="dashboard-hero">
          <div>
            <h1>Welcome, {user.name}</h1>
            <p>Manage your trial classes below.</p>
          </div>
          <div className="dashboard-hero-stats">
            <div className="dashboard-hero-stat">
              <div className="value">{upcoming.length}</div>
              <div className="label">Upcoming</div>
            </div>
            <div className="dashboard-hero-stat">
              <div className="value">{past.length}</div>
              <div className="label">Past</div>
            </div>
            <div className="dashboard-hero-stat">
              <div className="value">
                {user.freeTrialsRemaining != null
                  ? `${user.freeTrialsRemaining} / ${user.maxFreeTrialsPerFamily}`
                  : '—'}
              </div>
              <div className="label">Free Trials Left</div>
            </div>
          </div>
        </div>

        <div className="dashboard-tabs">
          <button className={tab === 'book' ? 'active' : ''} onClick={() => changeTab('book')}>
            Book New
          </button>
          <button className={tab === 'upcoming' ? 'active' : ''} onClick={() => changeTab('upcoming')}>
            Upcoming
          </button>
          <button className={tab === 'past' ? 'active' : ''} onClick={() => changeTab('past')}>
            Past
          </button>
        </div>

        {tab === 'book' && <SlotPicker onBooked={loadBookings} />}

        {tab !== 'book' && (
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
                perspective="parent"
                viewerTimezone={user.timezone}
                showCancel={tab === 'upcoming'}
                onChanged={loadBookings}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}