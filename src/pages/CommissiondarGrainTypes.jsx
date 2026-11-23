import { useState, useEffect, useCallback } from 'react';
import {
  getCommissiondarGrainTypes,
  createCommissiondarGrainType,
  describeError,
} from '../api';
import { useAuth } from '../context/AuthContext';

export default function CommissiondarGrainTypes() {
  const { token } = useAuth();

  const [grainTypes, setGrainTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('quintal');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const loadGrainTypes = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');

    try {
      const data = await getCommissiondarGrainTypes(token);
      setGrainTypes(Array.isArray(data) ? data : data?.grain_types || []);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadGrainTypes();
  }, [loadGrainTypes]);

  const handleSubmit = async e => {
    e.preventDefault();
    setFormError('');
    setSuccess('');

    if (!name.trim()) {
      setFormError('Please enter a grain type / variety name.');
      return;
    }

    setSaving(true);

    try {
      await createCommissiondarGrainType(
        {
          name: name.trim(),
          unit: unit.trim() || 'quintal',
        },
        token
      );

      setSuccess(`✓ Custom grain type "${name.trim()}" added successfully.`);
      setName('');
      setUnit('quintal');
      await loadGrainTypes();
    } catch (err) {
      setFormError(describeError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="commissiondar-grain-types-page">
      <div style={{ marginBottom: 24 }}>
        <p className="dashboard-eyebrow">COMMISSIONDAR / INVENTORY SETUP</p>
        <h1 style={{ margin: '4px 0 8px' }}>Custom Grain Types & Varieties</h1>
        <p style={{ color: 'var(--muted)', margin: 0 }}>
          Define the paddy varieties and custom grain types you receive from farmers and deliver to mills.
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

      {/* Add Grain Type Form */}
      <div className="panel" style={{ padding: 24, borderRadius: 18, border: '1px solid var(--border)', marginBottom: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 24 }}>🌾</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Add Custom Grain Type</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
              Specify the variety name and measurement unit.
            </p>
          </div>
        </div>

        {formError && (
          <p style={{ color: '#fca5a5', fontSize: 13, marginBottom: 12 }}>
            {formError}
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
            alignItems: 'end',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
              Grain / Variety Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Sona Masoori, BPT 5204, 1010"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={saving}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
              Measurement Unit
            </label>
            <select
              value={unit}
              onChange={e => setUnit(e.target.value)}
              disabled={saving}
            >
              <option value="quintal">Quintal (q)</option>
              <option value="bag">Bag (75kg / 50kg)</option>
              <option value="kg">Kilogram (kg)</option>
              <option value="ton">Metric Ton (t)</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            style={{ minHeight: 46 }}
          >
            {saving ? 'Saving...' : 'Add Grain Type'}
          </button>
        </form>
      </div>

      {/* Grain Types List */}
      <div className="panel" style={{ padding: 24, borderRadius: 18, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0 }}>Active Grain Types ({grainTypes.length})</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>
              These grain varieties are available when receiving stock from farmers and delivering to mills.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={loadGrainTypes}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : '↻ Refresh'}
          </button>
        </div>

        {loading ? (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 24 }}>Loading grain types...</p>
        ) : grainTypes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 36 }}>
            <p style={{ fontSize: 32, margin: 0 }}>🌾</p>
            <h3 style={{ margin: '12px 0 6px' }}>No custom grain types added yet</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
              Add your first grain type above so you can select it when receiving or delivering stock.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Variety / Name</th>
                  <th>Measurement Unit</th>
                  <th>Created Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {grainTypes.map(gt => (
                  <tr key={gt.id}>
                    <td>
                      <strong style={{ color: 'var(--green-light)', fontSize: '0.98rem' }}>
                        {gt.name}
                      </strong>
                    </td>
                    <td>
                      <span className="badge badge-farmer">
                        {gt.unit || 'quintal'}
                      </span>
                    </td>
                    <td>
                      {gt.created_at ? new Date(gt.created_at).toLocaleDateString('en-IN') : 'Active'}
                    </td>
                    <td>
                      <span className="badge badge-on">Active</span>
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
