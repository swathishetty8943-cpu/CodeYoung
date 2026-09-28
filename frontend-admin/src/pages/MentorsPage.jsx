import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import MentorFormModal from '../components/MentorFormModal';
import { adminApi, getErrorMessage } from '../services/api';

export default function MentorsPage() {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalMentor, setModalMentor] = useState(undefined); // undefined = closed, null = add, obj = edit

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.listMentors();
      setMentors(res.data.mentors);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load mentors.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaved = () => {
    setModalMentor(undefined);
    load();
  };

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Mentors</h1>
          <p className="page-subtitle">
            {mentors.length} mentor(s) on the platform · up to 2 trial slots per mentor per day by default.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalMentor(null)}>
          + Add Mentor
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={16} style={{ flex: 'none', marginTop: 2 }} />
          {error}
        </div>
      )}

      <div className="card">
        {loading ? (
          <p>Loading…</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Timezone</th>
                <th>Max/Day</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {mentors.map((m) => (
                <tr key={m.id}>
                  <td style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="avatar-circle" style={{ width: 30, height: 30, fontSize: '0.75rem' }}>
                      {m.name.charAt(0)}
                    </span>
                    {m.name}
                  </td>
                  <td>{m.email}</td>
                  <td>{m.timezone}</td>
                  <td>{m.maxClassesPerDay ?? 'Default'}</td>
                  <td>
                    <span className={`badge ${m.accountActive && m.profileActive ? 'badge-active' : 'badge-inactive'}`}>
                      {m.accountActive && m.profileActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-secondary" onClick={() => setModalMentor(m)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalMentor !== undefined && (
        <MentorFormModal
          mentor={modalMentor}
          onClose={() => setModalMentor(undefined)}
          onSaved={handleSaved}
        />
      )}
    </AdminLayout>
  );
}
