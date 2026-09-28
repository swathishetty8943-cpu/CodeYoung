import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { adminApi, getErrorMessage } from '../services/api';

export default function ConfigPage() {
  const [config, setConfig] = useState(null);
  const [blackoutInput, setBlackoutInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi
      .getConfig()
      .then((res) => setConfig(res.data.config))
      .catch((err) => setError(getErrorMessage(err, 'Could not load configuration.')))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const res = await adminApi.updateConfig({
        defaultMaxClassesPerDay: Number(config.defaultMaxClassesPerDay),
        reminderLeadTimeMinutes: Number(config.reminderLeadTimeMinutes),
        slotDurationMinutes: Number(config.slotDurationMinutes),
        maxFreeTrialsPerFamily: Number(config.maxFreeTrialsPerFamily),
        businessHours: {
          startHour: Number(config.businessHours.startHour),
          endHour: Number(config.businessHours.endHour),
        },
        blackoutDates: config.blackoutDates,
      });
      setConfig(res.data.config);
      setSuccess('Configuration saved.');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save configuration.'));
    } finally {
      setSaving(false);
    }
  };

  const addBlackoutDate = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(blackoutInput)) return;
    if (config.blackoutDates.includes(blackoutInput)) return;
    setConfig({ ...config, blackoutDates: [...config.blackoutDates, blackoutInput].sort() });
    setBlackoutInput('');
  };

  const removeBlackoutDate = (date) => {
    setConfig({ ...config, blackoutDates: config.blackoutDates.filter((d) => d !== date) });
  };

  return (
    <AdminLayout>
      <h1 className="page-title">Configuration</h1>
      <p className="page-subtitle">Platform-wide defaults for booking behavior.</p>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={16} style={{ flex: 'none', marginTop: 2 }} />
          {error}
        </div>
      )}
      {success && (
        <div className="success-banner">
          <CheckCircle2 size={16} style={{ flex: 'none', marginTop: 2 }} />
          {success}
        </div>
      )}
      {loading && <p>Loading…</p>}

      {config && (
        <form className="card" onSubmit={handleSave}>
          <div className="form-group">
            <label htmlFor="maxPerDay">Default max classes per mentor per day</label>
            <input
              id="maxPerDay"
              type="number"
              min="1"
              value={config.defaultMaxClassesPerDay}
              onChange={(e) => setConfig({ ...config, defaultMaxClassesPerDay: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label htmlFor="reminderLead">Reminder lead time (minutes)</label>
            <input
              id="reminderLead"
              type="number"
              min="0"
              value={config.reminderLeadTimeMinutes}
              onChange={(e) => setConfig({ ...config, reminderLeadTimeMinutes: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label htmlFor="slotDuration">Slot duration (minutes)</label>
            <input
              id="slotDuration"
              type="number"
              min="5"
              step="5"
              value={config.slotDurationMinutes}
              onChange={(e) => setConfig({ ...config, slotDurationMinutes: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label htmlFor="maxFreeTrials">Free trials per family</label>
            <input
              id="maxFreeTrials"
              type="number"
              min="0"
              value={config.maxFreeTrialsPerFamily}
              onChange={(e) => setConfig({ ...config, maxFreeTrialsPerFamily: e.target.value })}
            />
            <p style={{ color: 'var(--color-muted)', fontSize: '0.82rem', margin: '6px 0 0' }}>
              How many free trial classes each family can book before they need Full Coaching.
              Defaults to 5.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="startHour">Business hours start (0-23, mentor local)</label>
              <input
                id="startHour"
                type="number"
                min="0"
                max="23"
                value={config.businessHours.startHour}
                onChange={(e) =>
                  setConfig({ ...config, businessHours: { ...config.businessHours, startHour: e.target.value } })
                }
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="endHour">Business hours end (0-23)</label>
              <input
                id="endHour"
                type="number"
                min="0"
                max="23"
                value={config.businessHours.endHour}
                onChange={(e) =>
                  setConfig({ ...config, businessHours: { ...config.businessHours, endHour: e.target.value } })
                }
              />
            </div>
          </div>

          <div className="form-group">
            <label>Blackout dates</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                type="date"
                value={blackoutInput}
                onChange={(e) => setBlackoutInput(e.target.value)}
              />
              <button type="button" className="btn btn-secondary" onClick={addBlackoutDate}>
                Add
              </button>
            </div>
            {config.blackoutDates.length === 0 ? (
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>No blackout dates set.</p>
            ) : (
              <ul>
                {config.blackoutDates.map((d) => (
                  <li key={d} style={{ marginBottom: 4 }}>
                    {d}{' '}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '2px 10px', fontSize: '0.75rem' }}
                      onClick={() => removeBlackoutDate(d)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save Configuration'}
          </button>
        </form>
      )}
    </AdminLayout>
  );
}
