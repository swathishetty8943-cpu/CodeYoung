import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, PartyPopper, CalendarX } from 'lucide-react';
import { mentorApi, bookingApi, getErrorMessage } from '../services/api';
import { toDateInputValue, formatInZone } from '../utils/timezone';
import { useAuth } from '../context/AuthContext';

const EMPTY_STUDENT_DETAILS = {
  childName: '',
  ageOrGrade: '',
  subject: '',
  goals: '',
  contactPhone: '',
};

/**
 * Booking flow (spec section G): choose Free Trial or Full Coaching -> for
 * Full Coaching, fill in the student intake details -> pick a date -> see
 * slots in the parent's own local timezone -> confirm email -> submit ->
 * matching happens server-side -> success or a friendly "fully booked"
 * error with alternates.
 *
 * Free trials are capped at N per parent per day (the server sends the cap
 * and how many are used on the chosen date as `trialLimit`). That cap is
 * announced up front next to the "Preferred Time Slot" badge, and a parent
 * who has reached it for a date sees a message instead of bookable slots.
 * A time the parent has already booked is removed from their list for that
 * day (the server leaves it out of the availability response).
 *
 * A parent who has already used up their free trials (an admin-configured
 * count, default 5) can't select "Free Trial" again (mirrors the
 * server-side check), but Full Coaching stays available regardless.
 */
export default function SlotPicker({ onBooked }) {
  const { user } = useAuth();
  const freeTrialsExhausted = (user.freeTrialsRemaining ?? 1) <= 0;
  const [bookingType, setBookingType] = useState(freeTrialsExhausted ? 'full_coaching' : 'trial');
  const [studentDetails, setStudentDetails] = useState(EMPTY_STUDENT_DETAILS);
  const [detailsError, setDetailsError] = useState('');

  const [date, setDate] = useState(toDateInputValue());
  const [slots, setSlots] = useState([]);
  // { max, used, remaining } for the selected date, from the availability API.
  const [trialLimit, setTrialLimit] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [error, setError] = useState('');
  const [alternates, setAlternates] = useState([]);
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isFullCoaching = bookingType === 'full_coaching';
  // The per-day cap only applies to free trials, never Full Coaching.
  const trialDayLimitReached = !isFullCoaching && !!trialLimit && trialLimit.remaining <= 0;

  // Loads the parent's preferred-slot list for `date`. Quiet refreshes (after
  // a booking attempt) keep the current success/error banner on screen.
  const fetchSlots = useCallback(
    async ({ isCancelled = () => false, quiet = false } = {}) => {
      if (!quiet) {
        setLoadingSlots(true);
        setSelectedSlot(null);
        setError('');
        setAlternates([]);
      }
      try {
        const res = await mentorApi.getAvailability(date, user.timezone);
        if (isCancelled()) return;
        setSlots(res.data.slots || []);
        setTrialLimit(res.data.trialLimit || null);
      } catch (err) {
        if (!isCancelled() && !quiet) setError(getErrorMessage(err, 'Could not load availability.'));
      } finally {
        if (!isCancelled() && !quiet) setLoadingSlots(false);
      }
    },
    [date, user.timezone]
  );

  useEffect(() => {
    let cancelled = false;
    fetchSlots({ isCancelled: () => cancelled });
    return () => {
      cancelled = true;
    };
  }, [fetchSlots]);

  const updateDetail = (field) => (e) =>
    setStudentDetails((prev) => ({ ...prev, [field]: e.target.value }));

  const detailsAreComplete = () =>
    Object.values(studentDetails).every((v) => v.trim().length > 0);

  const handleConfirm = async () => {
    setError('');
    setDetailsError('');
    setAlternates([]);
    setSuccess('');

    // Email existence/format check happens on the backend too, but we also
    // do a quick client-side format check so the person sees the problem
    // immediately, before submitting - never after (spec requirement).
    const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail);
    if (!emailLooksValid) {
      setError('Please enter a valid email address before confirming.');
      return;
    }

    if (isFullCoaching && !detailsAreComplete()) {
      setDetailsError('Please fill in all the student details below before confirming.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = { date, time: selectedSlot.timeStr, contactEmail, bookingType };
      if (isFullCoaching) payload.studentDetails = studentDetails;

      const res = await bookingApi.create(payload);
      const created = res.data.booking;
      const classNoun = isFullCoaching ? 'coaching session' : 'trial class';

      // requestedTimeUTC is only set by the backend when the exact time the
      // parent picked had no mentor free and it auto-adjusted to the
      // nearest bookable slot - surface that clearly instead of silently
      // showing the same generic success message.
      if (created?.requestedTimeUTC) {
        setSuccess(
          `Your preferred time wasn't available, so we matched you with the closest open slot: ` +
            `${formatInZone(created.startTimeUTC, user.timezone)}. Check your email for the confirmation and meet link.`
        );
      } else {
        setSuccess(
          isFullCoaching
            ? `Your ${classNoun} is booked! Check your email for the confirmation and meet link.`
            : `Your ${classNoun} is booked! Check your email for the confirmation and meet link.`
        );
      }
      setSelectedSlot(null);
      onBooked?.();
      // The booked time (which may differ from the preferred one if we
      // adjusted it) drops out of the list, and the "N of 2 used" count updates.
      await fetchSlots({ quiet: true });
    } catch (err) {
      setError(getErrorMessage(err, 'This time is fully booked - please try a different slot.'));
      setAlternates(err?.response?.data?.details?.alternateSlots || []);
      // e.g. the daily free-trial limit was hit from another tab/device.
      await fetchSlots({ quiet: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <h2>Book a Class</h2>

      <div className="form-group">
        <label>What would you like to book?</label>
        <div className="slot-grid" style={{ gridTemplateColumns: '1fr 1fr', maxWidth: 480 }}>
          <button
            type="button"
            className={`slot-btn ${bookingType === 'trial' ? 'selected' : ''}`}
            onClick={() => setBookingType('trial')}
            disabled={freeTrialsExhausted}
            title={freeTrialsExhausted ? 'You have used all of your free trials' : ''}
          >
            Free Trial{freeTrialsExhausted ? ' (used up)' : user.freeTrialsRemaining != null ? ` (${user.freeTrialsRemaining} left)` : ''}
          </button>
          <button
            type="button"
            className={`slot-btn ${bookingType === 'full_coaching' ? 'selected' : ''}`}
            onClick={() => setBookingType('full_coaching')}
          >
            Full Coaching
          </button>
        </div>
      </div>

      {bookingType === 'trial' && freeTrialsExhausted && (
        <p className="empty-state" style={{ textAlign: 'left' }}>
          You've used all of your free trials. Switch to <strong>Full Coaching</strong> above to
          book a paid session, or check your Upcoming/Past tabs for your existing trials.
        </p>
      )}

      {(bookingType === 'trial' ? !freeTrialsExhausted : true) && (
        <>
          <p className="page-subtitle" style={{ marginTop: 16 }}>
            All times shown below are in your local timezone ({user.timezone}).
          </p>

          {error && (
            <div className="error-banner">
              <AlertTriangle size={16} style={{ flex: 'none', marginTop: 2 }} />
              {error}
            </div>
          )}
          {success && (
            <div className="success-banner">
              <PartyPopper size={16} style={{ flex: 'none', marginTop: 2 }} />
              {success}
            </div>
          )}

          {isFullCoaching && (
            <div style={{ marginBottom: 20, borderBottom: '1px solid var(--color-border)', paddingBottom: 20 }}>
              <h3 style={{ marginTop: 0 }}>Tell us about your child</h3>
              {detailsError && (
                <div className="error-banner">
                  <AlertTriangle size={16} style={{ flex: 'none', marginTop: 2 }} />
                  {detailsError}
                </div>
              )}
              <div className="form-group">
                <label htmlFor="childName">Child's name</label>
                <input id="childName" value={studentDetails.childName} onChange={updateDetail('childName')} />
              </div>
              <div className="form-group">
                <label htmlFor="ageOrGrade">Age / Grade</label>
                <input id="ageOrGrade" value={studentDetails.ageOrGrade} onChange={updateDetail('ageOrGrade')} />
              </div>
              <div className="form-group">
                <label htmlFor="subject">Subject of interest</label>
                <input
                  id="subject"
                  placeholder="e.g. Python, Scratch, Web Development"
                  value={studentDetails.subject}
                  onChange={updateDetail('subject')}
                />
              </div>
              <div className="form-group">
                <label htmlFor="goals">Learning goals</label>
                <textarea
                  id="goals"
                  rows={3}
                  placeholder="What would you like your child to get out of coaching?"
                  value={studentDetails.goals}
                  onChange={updateDetail('goals')}
                />
              </div>
              <div className="form-group">
                <label htmlFor="contactPhone">Contact number</label>
                <input
                  id="contactPhone"
                  type="tel"
                  value={studentDetails.contactPhone}
                  onChange={updateDetail('contactPhone')}
                />
              </div>
            </div>
          )}

          <div className="form-group" style={{ maxWidth: 220 }}>
            <label htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              min={toDateInputValue()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {loadingSlots && <p>Loading available times…</p>}

          {!loadingSlots && trialDayLimitReached && (
            <div className="error-banner">
              <AlertTriangle size={16} style={{ flex: 'none', marginTop: 2 }} />
              You can have only {trialLimit.max} free trial classes per day, and you've already booked{' '}
              {trialLimit.used} for this date. Please choose another date for your next free trial.
            </div>
          )}

          {!loadingSlots && slots.length === 0 && !trialDayLimitReached && (
            <p className="empty-state">
              <span className="empty-icon"><CalendarX size={34} /></span>
              No slots available on this date. Try another day.
            </p>
          )}

          {!loadingSlots && (slots.length > 0 || (!isFullCoaching && trialLimit)) && (
            <>
              <div className="slot-section-header">
                <label>Available times</label>
                <div className="slot-header-badges">
                  <span className="side-heading">Preferred Time Slot</span>
                  {!isFullCoaching && trialLimit && (
                    <span className={`trial-limit-badge ${trialDayLimitReached ? 'reached' : ''}`}>
                      Max {trialLimit.max} free trials per day · {trialLimit.used} of {trialLimit.max} used on this date
                    </span>
                  )}
                </div>
              </div>
              <div className="slot-grid">
                {slots.map((slot) => (
                  <button
                    key={slot.timeStr}
                    className={`slot-btn ${selectedSlot?.timeStr === slot.timeStr ? 'selected' : ''}`}
                    onClick={() => setSelectedSlot(slot)}
                    disabled={trialDayLimitReached}
                    title={trialDayLimitReached ? 'Daily free trial limit reached for this date' : ''}
                  >
                    {slot.timeStr}
                  </button>
                ))}
              </div>
            </>
          )}

          {alternates.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-muted)' }}>Try one of these instead:</p>
              <div className="slot-grid">
                {alternates.map((a) => (
                  <button key={a.timeStr} className="slot-btn" onClick={() => setSelectedSlot(a)}>
                    {a.timeStr}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedSlot && !trialDayLimitReached && (
            <div style={{ marginTop: 20, borderTop: '1px solid var(--color-border)', paddingTop: 20 }}>
              <div className="form-group">
                <label htmlFor="contactEmail">Confirm the email for this booking</label>
                <input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" onClick={handleConfirm} disabled={submitting}>
                {submitting ? 'Booking…' : `Confirm ${selectedSlot.timeStr}`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}