import { useState } from 'react';
import { ClipboardList, AlertTriangle } from 'lucide-react';
import { formatInZone } from '../utils/timezone';
import { bookingApi, getErrorMessage } from '../services/api';

/**
 * Renders a list of bookings. `perspective` is 'parent' or 'mentor' and
 * controls whose name is shown as the "counterpart" and whether a
 * cancel action is offered (only for upcoming, non-cancelled bookings).
 *
 * Time is always shown as a pair: the viewer's own local time first
 * (primary), and the counterpart's local time underneath (secondary) - so
 * a US/UK parent and an India-based mentor can each tell, at a glance,
 * what time this is for the other person too, without doing the math
 * themselves.
 */
export default function BookingList({ bookings, perspective, viewerTimezone, showCancel, onChanged }) {
  const [cancellingId, setCancellingId] = useState(null);
  const [error, setError] = useState('');

  if (!bookings || bookings.length === 0) {
    return (
      <p className="empty-state">
        <span className="empty-icon"><ClipboardList size={34} /></span>
        Nothing here yet.
      </p>
    );
  }

  const handleCancel = async (id) => {
    setError('');
    setCancellingId(id);
    try {
      await bookingApi.cancel(id);
      onChanged?.();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not cancel this class.'));
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div>
      {error && (
        <div className="error-banner">
          <AlertTriangle size={16} style={{ flex: 'none', marginTop: 2 }} />
          {error}
        </div>
      )}
      <div className="booking-list">
        {bookings.map((b) => {
          const counterpart = perspective === 'parent' ? b.mentorId : b.parentId;
          const counterpartName = counterpart?.name || 'Unknown';
          const counterpartLabel = perspective === 'parent' ? 'Mentor' : 'Parent';

          return (
            <div className="booking-item" key={b._id}>
              <div className="booking-item-left">
                <div className="avatar-circle">{counterpartName.charAt(0)}</div>
                <div>
                  <div>
                    {counterpartLabel}: <strong>{counterpartName}</strong>
                  </div>

                  <div className="time-pair" style={{ marginTop: 6 }}>
                    <span className="time-primary">{formatInZone(b.startTimeUTC, viewerTimezone)}</span>
                    {counterpart?.timezone && (
                      <span className="time-secondary">
                        <span className="who">{counterpartLabel}'s time: </span>
                        {formatInZone(b.startTimeUTC, counterpart.timezone)}
                      </span>
                    )}
                  </div>

                  <div className="meta" style={{ marginTop: 4 }}>
                    {b.bookingType === 'full_coaching' && <span>Full Coaching</span>}
                    {b.bookingType !== 'full_coaching' && <span>Free Trial</span>}
                    {b.status === 'cancelled' && <span className="status-cancelled"> · Cancelled</span>}
                    {b.status === 'completed' && <span className="status-completed"> · Completed</span>}
                  </div>

                  {b.requestedTimeUTC && (
                    <div className="meta" style={{ marginTop: 2, fontStyle: 'italic' }}>
                      Adjusted from originally requested {formatInZone(b.requestedTimeUTC, viewerTimezone)}
                    </div>
                  )}
                  {b.bookingType === 'full_coaching' && b.studentDetails && (
                    <div className="meta" style={{ marginTop: 4 }}>
                      {b.studentDetails.childName} ({b.studentDetails.ageOrGrade}) · {b.studentDetails.subject}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {b.status === 'confirmed' && (
                  <a href={b.meetLink} target="_blank" rel="noreferrer" className="btn btn-secondary">
                    Join Link
                  </a>
                )}
                {showCancel && b.status === 'confirmed' && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleCancel(b._id)}
                    disabled={cancellingId === b._id}
                  >
                    {cancellingId === b._id ? 'Cancelling…' : 'Cancel'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
