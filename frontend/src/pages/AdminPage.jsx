import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  getRequests,
  recalculatePriorities,
  adminListUsers,
  adminCreateUser,
  adminUpdateUser,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { roleLabel } from '../utils/roles';
import LoadingState from '../components/LoadingState';

const errorText = (err, fallback) => err?.response?.data?.message || fallback;

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—');

const urgencyBadge = (urgency) => {
  if (urgency === 'HIGH') return 'badge badge-danger';
  if (urgency === 'MEDIUM') return 'badge badge-warning';
  return 'badge badge-neutral';
};

// ---------- Complaints tab (officer, admin, super_admin) ----------
const ComplaintsTab = () => {
  const { isAdmin } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [recalcMessage, setRecalcMessage] = useState('');
  const [recalcBusy, setRecalcBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getRequests();
      setRequests(response.requests || []);
    } catch (err) {
      setError(errorText(err, 'Could not load complaints.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((r) =>
      [r.requestId, r.originalText, r.category, r.location?.district, r.location?.state]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [requests, search]);

  const handleRecalculate = async () => {
    setRecalcBusy(true);
    setRecalcMessage('');
    try {
      await recalculatePriorities();
      setRecalcMessage('Priorities recalculated.');
    } catch (err) {
      setRecalcMessage(errorText(err, 'Recalculation failed.'));
    } finally {
      setRecalcBusy(false);
    }
  };

  if (loading) return <LoadingState label="Loading complaints..." />;

  return (
    <div className="surface-card section-block">
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Search by ID, text, category, district..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '1 1 260px' }}
        />
        <button type="button" className="btn btn-secondary" onClick={load}>Refresh</button>
        {isAdmin && (
          <button type="button" className="btn btn-primary" onClick={handleRecalculate} disabled={recalcBusy}>
            {recalcBusy ? 'Recalculating...' : 'Recalculate Priorities'}
          </button>
        )}
      </div>

      {recalcMessage && <div className="form-hint" style={{ marginBottom: '12px' }}>{recalcMessage}</div>}
      {error && <div className="badge badge-danger" style={{ marginBottom: '12px' }}>{error}</div>}

      <div className="form-hint" style={{ marginBottom: '8px' }}>
        Showing {filtered.length} of {requests.length} complaints
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Submitted</th>
              <th>Category</th>
              <th>Location</th>
              <th>Urgency</th>
              <th>Source</th>
              <th>Complaint</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.requestId}>
                <td>{r.requestId}</td>
                <td>{formatDate(r.timestamp)}</td>
                <td>{r.category}</td>
                <td>{[r.location?.district, r.location?.state].filter(Boolean).join(', ') || '—'}</td>
                <td>{r.urgency ? <span className={urgencyBadge(r.urgency)}>{r.urgency}</span> : '—'}</td>
                <td>{r.source}</td>
                <td style={{ maxWidth: 320 }}>
                  {r.originalText?.length > 120 ? `${r.originalText.slice(0, 120)}…` : r.originalText}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7}>No complaints found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---------- Users tab (super_admin only) ----------
const EMPTY_FORM = { name: '', email: '', password: '', role: 'officer', department: '' };

const UsersTab = () => {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminListUsers();
      setUsers(response.users || []);
    } catch (err) {
      setError(errorText(err, 'Could not load users.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await adminCreateUser({ ...form, email: form.email.trim() });
      setNotice(`Created ${form.role} account for ${form.email.trim()}.`);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setError(errorText(err, 'Could not create the account.'));
    } finally {
      setSaving(false);
    }
  };

  const update = async (id, payload) => {
    setError('');
    setNotice('');
    try {
      await adminUpdateUser(id, payload);
      await load();
    } catch (err) {
      setError(errorText(err, 'Could not update the account.'));
    }
  };

  return (
    <div>
      <div className="surface-card section-block" style={{ marginBottom: '16px' }}>
        <h3>Create staff account</h3>
        <form onSubmit={handleCreate} className="form-grid-2">
          <div className="form-field">
            <label className="form-label" htmlFor="new-name">Full name</label>
            <input id="new-name" type="text" value={form.name} onChange={setField('name')} />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="new-email">Email</label>
            <input id="new-email" type="text" inputMode="email" value={form.email} onChange={setField('email')} required />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="new-password">Temporary password (min 8)</label>
            <input id="new-password" type="password" value={form.password} onChange={setField('password')} required minLength={8} autoComplete="new-password" />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="new-role">Role</label>
            <select id="new-role" value={form.role} onChange={setField('role')}>
              <option value="officer">Officer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="new-dept">Department (optional)</label>
            <input id="new-dept" type="text" value={form.department} onChange={setField('department')} />
          </div>
          <div className="form-field" style={{ alignSelf: 'end' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create account'}
            </button>
          </div>
        </form>
        {notice && <div className="form-hint" style={{ marginTop: '12px' }}>{notice}</div>}
        {error && <div className="badge badge-danger" style={{ marginTop: '12px' }}>{error}</div>}
      </div>

      <div className="surface-card section-block">
        <h3>All accounts</h3>
        {loading ? (
          <LoadingState label="Loading users..." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Last login</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const locked = u.role === 'super_admin' || u.id === me?.id;
                  return (
                    <tr key={u.id}>
                      <td>{u.name || '—'}</td>
                      <td>{u.email}</td>
                      <td>
                        {locked ? (
                          roleLabel(u.role)
                        ) : (
                          <select value={u.role} onChange={(e) => update(u.id, { role: e.target.value })}>
                            <option value="citizen">Citizen</option>
                            <option value="officer">Officer</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </td>
                      <td>{u.department || '—'}</td>
                      <td>
                        <span className={u.isActive ? 'badge badge-success' : 'badge badge-danger'}>
                          {u.isActive ? 'Active' : 'Deactivated'}
                        </span>
                        {!locked && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ marginLeft: '8px' }}
                            onClick={() => update(u.id, { isActive: !u.isActive })}
                          >
                            {u.isActive ? 'Deactivate' : 'Reactivate'}
                          </button>
                        )}
                      </td>
                      <td>{formatDate(u.lastLoginAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------- Page shell ----------
const AdminPage = () => {
  const { user, isSuperAdmin } = useAuth();
  const [tab, setTab] = useState('complaints');

  return (
    <div>
      <div className="page-header">
        <div className="page-header-eyebrow">Administration</div>
        <h1>Control Panel</h1>
        <p>Signed in as {user?.email} · {roleLabel(user?.role)}</p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          type="button"
          className={`btn ${tab === 'complaints' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('complaints')}
        >
          Complaints
        </button>
        {isSuperAdmin && (
          <button
            type="button"
            className={`btn ${tab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab('users')}
          >
            Users &amp; Roles
          </button>
        )}
      </div>

      {tab === 'complaints' && <ComplaintsTab />}
      {tab === 'users' && isSuperAdmin && <UsersTab />}
    </div>
  );
};

export default AdminPage;
