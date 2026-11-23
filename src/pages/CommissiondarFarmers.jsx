import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  getCommissiondarFarmers,
  createCommissiondarFarmer,
  describeError,
} from '../api';
import { useAuth } from '../context/AuthContext';

export default function CommissiondarFarmers() {
  const { token } = useAuth();

  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [name, setName] = useState('');
  const [village, setVillage] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');

  const loadFarmers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');

    try {
      const data = await getCommissiondarFarmers(token);
      setFarmers(Array.isArray(data) ? data : data?.farmers || []);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadFarmers();
  }, [loadFarmers]);

  const handleSubmit = async e => {
    e.preventDefault();
    setFormError('');
    setSuccess('');

    if (!name.trim()) {
      setFormError('Please enter the farmer name.');
      return;
    }

    setSaving(true);

    try {
      await createCommissiondarFarmer(
        {
          name: name.trim(),
          village: village.trim() || null,
          phone: phone.trim() || null,
        },
        token
      );

      setSuccess(`✓ Farmer "${name.trim()}" added successfully.`);
      setName('');
      setVillage('');
      setPhone('');
      await loadFarmers();
    } catch (err) {
      setFormError(describeError(err));
    } finally {
      setSaving(false);
    }
  };

  const filteredFarmers = farmers.filter(f => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      f.name?.toLowerCase().includes(q) ||
      f.village?.toLowerCase().includes(q) ||
      f.phone?.includes(q) ||
      String(f.id).includes(q)
    );
  });

  const cardStyle = {
    padding: 22,
    borderRadius: 14,
    marginBottom: 24,
    border: '1px solid var(--border)',
    background: 'var(--surface)',
  };

  const inputStyle = {
    width: '100%',
    padding: '11px 12px',
    marginTop: 7,
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--surface-soft)',
    color: 'var(--ink)',
    boxSizing: 'border-box',
    fontSize: '0.95rem',
  };

  return (
    <div className="commissiondar-farmers-page">
      <div style={{ marginBottom: 24 }}>
        <p className="dashboard-eyebrow">COMMISSIONDAR / FARMERS</p>
        <h1 style={{ margin: '4px 0 8px' }}>My Farmers Network</h1>
        <p style={{ color: 'var(--muted)', margin: 0 }}>
          Manage your personal network of registered farmer producers.
        </p>
      </div>

      {error && (
        <div className="panel form-error" role="alert" style={{ padding: 14, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {success && (
        <div className="panel" role="status" style={{ padding: 14, marginBottom: 16, color: 'var(--green-light)', borderLeft: '4px solid var(--green)' }}>
          {success}
        </div>
      )}

      {/* Add Farmer Form */}
      <div className="panel" style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 22 }}>🌾</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Register New Farmer</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
              Add a farmer to your account to issue loans and record grain intake.
            </p>
          </div>
        </div>

        {formError && (
          <p style={{ color: '#f18d83', fontSize: 13, marginBottom: 12 }}>
            {formError}
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            alignItems: 'end',
          }}
        >
          <label>
            <b>Farmer Full Name *</b>
            <input
              style={inputStyle}
              type="text"
              placeholder="e.g. Venkata Rao"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={saving}
              required
            />
          </label>

          <label>
            <b>Village</b>
            <input
              style={inputStyle}
              type="text"
              placeholder="e.g. Palakollu"
              value={village}
              onChange={e => setVillage(e.target.value)}
              disabled={saving}
            />
          </label>

          <label>
            <b>Phone Number</b>
            <input
              style={inputStyle}
              type="tel"
              placeholder="10-digit mobile"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              disabled={saving}
            />
          </label>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            style={{ minHeight: 44 }}
          >
            {saving ? 'Registering...' : 'Add Farmer'}
          </button>
        </form>
      </div>

      {/* Farmers Directory */}
      <div className="panel" style={{ padding: 22, borderRadius: 14, border: '1px solid var(--border)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 14,
            marginBottom: 18,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Farmer Producers ({farmers.length})</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>
              Farmers registered directly with your commissiondar account.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="search"
              placeholder="Search farmer name, village..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface-soft)',
                color: 'var(--ink)',
                fontSize: 14,
                minWidth: 220,
              }}
            />

            <button
              type="button"
              className="btn btn-ghost"
              onClick={loadFarmers}
              disabled={loading || saving}
            >
              {loading ? 'Refreshing...' : '↻ Refresh'}
            </button>
          </div>
        </div>

        {loading ? (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 24 }}>
            Loading your farmers network...
          </p>
        ) : filteredFarmers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 36 }}>
            <p style={{ fontSize: 32, margin: 0 }}>👨‍🌾</p>
            <h3 style={{ margin: '12px 0 6px' }}>No farmers found</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
              {farmers.length === 0
                ? 'Register your first farmer above to get started.'
                : 'No farmers match your search term.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 650 }}>
              <thead>
                <tr>
                  <th>Farmer ID</th>
                  <th>Full Name</th>
                  <th>Village</th>
                  <th>Phone</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredFarmers.map(f => (
                  <tr key={f.id}>
                    <td>
                      <strong style={{ color: 'var(--gold)' }}>#{f.id}</strong>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--ink)' }}>{f.name}</strong>
                    </td>
                    <td style={{ color: 'var(--ink-soft)' }}>
                      📍 {f.village || 'Not specified'}
                    </td>
                    <td>
                      📞 {f.phone || '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Link
                          className="btn btn-small"
                          to="/commissiondar/stock"
                          title="Record grain inflow from this farmer"
                        >
                          📥 Receive Stock
                        </Link>
                        <Link
                          className="btn btn-ghost btn-small"
                          to="/commissiondar/loans"
                          title="Issue loan to this farmer"
                        >
                          💰 Issue Loan
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
