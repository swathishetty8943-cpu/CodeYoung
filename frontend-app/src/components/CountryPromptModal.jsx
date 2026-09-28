import { useMemo, useState } from 'react';
import { Globe, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../services/api';
import { detectBrowserTimezone } from '../utils/timezone';
import { COUNTRIES, getCountry, defaultTimezoneForCountry } from '../utils/countries';

/**
 * Shown once, on the parent dashboard, to a parent who signed up with Google
 * (Google gives us a name/email but no country). It's deliberately not
 * dismissible: every class time shown or emailed depends on the parent's
 * timezone, so we need the country before they can book anything.
 * Same country/timezone choices as the password signup form.
 */
export default function CountryPromptModal() {
  const { setCountry: saveCountry } = useAuth();
  const detectedZone = useMemo(() => detectBrowserTimezone(), []);

  const [country, setCountry] = useState('');
  const [timezone, setTimezone] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const timezoneOptions = country ? getCountry(country)?.timezones || [] : [];

  const handleCountryChange = (code) => {
    setCountry(code);
    // "Other" only has a placeholder UTC zone - keep the browser's real zone.
    setTimezone(code === 'OTHER' ? detectedZone : defaultTimezoneForCountry(code, detectedZone));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!country) {
      setError('Please select your country.');
      return;
    }
    setSaving(true);
    try {
      await saveCountry({ country, timezone: timezone || detectedZone });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save your country. Please try again.'));
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="country-modal-title">
      <form className="modal-card" onSubmit={handleSubmit}>
        <div className="modal-icon"><Globe size={22} /></div>
        <h2 id="country-modal-title">Which country are you in?</h2>
        <p className="page-subtitle">
          Welcome! Since you signed up with Google, we just need your country so we can show class
          times in your local time.
        </p>

        {error && (
          <div className="error-banner">
            <AlertTriangle size={16} style={{ flex: 'none', marginTop: 2 }} />
            {error}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="prompt-country">Country</label>
          <select
            id="prompt-country"
            required
            value={country}
            onChange={(e) => handleCountryChange(e.target.value)}
          >
            <option value="" disabled>Select your country</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>

        {timezoneOptions.length > 1 && (
          <div className="form-group">
            <label htmlFor="prompt-timezone">Timezone</label>
            <select
              id="prompt-timezone"
              required
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {timezoneOptions.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>
        )}

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving}>
          {saving ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </div>
  );
}