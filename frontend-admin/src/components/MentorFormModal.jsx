import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { adminApi, getErrorMessage } from '../services/api';

const COMMON_TIMEZONES = ['Asia/Kolkata', 'America/New_York', 'America/Los_Angeles', 'Europe/London'];

/**
 * Handles both "add mentor" (mentor is null) and "edit mentor" (mentor
 * provided) in one form, since the fields largely overlap. Add always
 * sends an invite email server-side (spec section 4); edit never touches
 * password/invite logic.
 */
export default function MentorFormModal({ mentor, onClose, onSaved }) {
  const isEdit = !!mentor;
  const [name, setName] = useState(mentor?.name || '');
  const [email, setEmail] = useState(mentor?.email || '');
  const [timezone, setTimezone] = useState(mentor?.timezone || 'Asia/Kolkata');
  const [expertise, setExpertise] = useState((mentor?.expertise || []).join(', '));
  const [maxClassesPerDay, setMaxClassesPerDay] = useState(mentor?.maxClassesPerDay ?? '');
  const [accountActive, setAccountActive] = useState(mentor?.accountActive ?? true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const expertiseArray = expertise
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (isEdit) {
        await adminApi.updateMentor(mentor.id, {
          name,
          timezone,
          expertise: expertiseArray,
          maxClassesPerDay: maxClassesPerDay === '' ? null : Number(maxClassesPerDay),
          accountActive,
        });
      } else {
        await adminApi.createMentor({
          name,
          email,
          timezone,
          expertise: expertiseArray,
          maxClassesPerDay: maxClassesPerDay === '' ? undefined : Number(maxClassesPerDay),
        });
      }
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save mentor.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box card" onClick={(e) => e.stopPropagation()}>
        <h2>{isEdit ? 'Edit Mentor' : 'Add Mentor'}</h2>
        {error && (
          <div className="error-banner">
            <AlertTriangle size={16} style={{ flex: 'none', marginTop: 2 }} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              disabled={isEdit}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {isEdit && (
              <small style={{ color: 'var(--color-muted)' }}>Email cannot be changed after creation.</small>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="timezone">Timezone</label>
            <select id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="expertise">Expertise (comma-separated)</label>
            <input
              id="expertise"
              value={expertise}
              onChange={(e) => setExpertise(e.target.value)}
              placeholder="Python, Scratch, Web Development"
            />
          </div>
          <div className="form-group">
            <label htmlFor="maxClasses">Max classes/day (leave blank for platform default)</label>
            <input
              id="maxClasses"
              type="number"
              min="1"
              value={maxClassesPerDay}
              onChange={(e) => setMaxClassesPerDay(e.target.value)}
            />
          </div>
          {isEdit && (
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={accountActive}
                  onChange={(e) => setAccountActive(e.target.checked)}
                  style={{ width: 'auto', marginRight: 8 }}
                />
                Account active
              </label>
              <small style={{ color: 'var(--color-muted)' }}>
                Deactivating stops new assignments but never cancels already-confirmed classes.
              </small>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
