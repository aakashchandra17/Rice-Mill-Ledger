import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  getCommissiondarStock,
  receiveCommissiondarStock,
  deliverCommissiondarStock,
  getCommissiondarFarmers,
  getCommissiondarGrainTypes,
  describeError,
} from '../api';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from '../components/SearchableSelect';

const quantity = value =>
  Number(value || 0).toLocaleString('en-IN');

const money = value =>
  '₹' + Number(value || 0).toLocaleString('en-IN');

const formatDate = value => {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function CommissiondarStock() {
  const { token, user } = useAuth();

  const [stock, setStock] = useState(null);
  const [farmers, setFarmers] = useState([]);
  const [grainTypes, setGrainTypes] = useState([]);

  // Load My Mills from local storage
  const userKey = user?.id || user?.phone || 'default';
  const millsStorageKey = `commissiondar_mills_${userKey}`;
  const myMills = useMemo(() => {
    try {
      const saved = localStorage.getItem(millsStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }, [millsStorageKey]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Receive Form State
  const [farmerId, setFarmerId] = useState('');
  const [receiveGrainTypeId, setReceiveGrainTypeId] = useState('');
  const [receiveQuantity, setReceiveQuantity] = useState('');
  const [receiveRate, setReceiveRate] = useState('');

  // Deliver Form State
  const [millName, setMillName] = useState('');
  const [deliverGrainTypeId, setDeliverGrainTypeId] = useState('');
  const [deliverQuantity, setDeliverQuantity] = useState('');
  const [deliverRate, setDeliverRate] = useState('');

  const loadStock = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError('Please log in again.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const result = await getCommissiondarStock(token);
      setStock(result || {});
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadAuxData = useCallback(async () => {
    if (!token) return;
    try {
      const [fData, gData] = await Promise.allSettled([
        getCommissiondarFarmers(token),
        getCommissiondarGrainTypes(token),
      ]);
      if (fData.status === 'fulfilled') {
        const list = Array.isArray(fData.value) ? fData.value : fData.value?.farmers || [];
        setFarmers(list);
      }
      if (gData.status === 'fulfilled') {
        const list = Array.isArray(gData.value) ? gData.value : gData.value?.grain_types || [];
        setGrainTypes(list);
      }
    } catch {
      // non-blocking
    }
  }, [token]);

  useEffect(() => {
    loadStock();
    loadAuxData();
  }, [loadStock, loadAuxData]);

  const farmerMap = useMemo(() => {
    const map = {};
    farmers.forEach(f => {
      map[f.id] = f.name;
    });
    return map;
  }, [farmers]);

  const grainTypeMap = useMemo(() => {
    const map = {};
    grainTypes.forEach(g => {
      map[g.id] = g.name;
    });
    return map;
  }, [grainTypes]);

  // Options for SearchableSelect
  const farmerOptions = useMemo(() => {
    return farmers.map(f => ({
      id: f.id,
      name: f.name,
      subtitle: f.village ? `Village: ${f.village}` : 'Farmer',
      badge: f.phone || undefined,
    }));
  }, [farmers]);

  const grainOptions = useMemo(() => {
    return grainTypes.map(g => ({
      id: g.id,
      name: g.name,
      subtitle: `Unit: ${g.unit || 'quintal'}`,
      badge: g.unit || undefined,
    }));
  }, [grainTypes]);

  const millOptions = useMemo(() => {
    return myMills
      .filter(m => m.isActive !== false)
      .map(m => ({
        id: m.name,
        name: m.name,
        subtitle: m.location ? `Location: ${m.location}` : 'Rice Mill',
        badge: 'My Mills',
      }));
  }, [myMills]);

  async function handleReceive(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    const fId = Number(farmerId);
    const qty = Number(receiveQuantity);

    if (!Number.isInteger(fId) || fId <= 0 || !Number.isFinite(qty) || qty <= 0) {
      setError('Please select a Farmer by name and specify positive Quantity.');
      return;
    }

    setBusy(true);

    try {
      const payload = {
        farmer_id: fId,
        quantity: qty,
      };

      if (receiveGrainTypeId) {
        payload.grain_type_id = Number(receiveGrainTypeId);
      }

      if (receiveRate !== '') {
        payload.rate = Number(receiveRate);
      }

      await receiveCommissiondarStock(payload, token);

      setMessage('✓ Stock received successfully.');
      setFarmerId('');
      setReceiveGrainTypeId('');
      setReceiveQuantity('');
      setReceiveRate('');
      await loadStock();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeliver(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    const targetMill = millName.trim();
    const qty = Number(deliverQuantity);

    if (!targetMill || !Number.isFinite(qty) || qty <= 0) {
      setError('Please select/enter a Mill Name and positive Quantity.');
      return;
    }

    setBusy(true);

    try {
      const payload = {
        mill_name: targetMill,
        quantity: qty,
      };

      if (deliverGrainTypeId) {
        payload.grain_type_id = Number(deliverGrainTypeId);
      }

      if (deliverRate !== '') {
        payload.rate = Number(deliverRate);
      }

      await deliverCommissiondarStock(payload, token);

      setMessage('✓ Stock delivery recorded successfully.');
      setMillName('');
      setDeliverGrainTypeId('');
      setDeliverQuantity('');
      setDeliverRate('');
      await loadStock();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  const rawHistory = Array.isArray(stock?.history) ? stock.history : [];
  const validHistory = rawHistory.filter(
    item => typeof item === 'object' && item !== null
  );

  const currentStock = stock?.current_stock ?? stock?.currentStock ?? 0;
  const totalReceived = stock?.total_received ?? stock?.totalReceived ?? 0;
  const totalDelivered = stock?.total_delivered ?? stock?.totalDelivered ?? 0;

  const summaries = [
    {
      label: 'Current In-Stock',
      value: quantity(currentStock),
      note: 'Available in your yard/godown',
      color: 'var(--green-glow)',
    },
    {
      label: 'Total Received',
      value: quantity(totalReceived),
      note: 'Total grain received from farmers',
      color: 'var(--ink)',
    },
    {
      label: 'Total Delivered',
      value: quantity(totalDelivered),
      note: 'Total grain delivered to mills',
      color: 'var(--cyan)',
    },
    {
      label: 'Total Movements',
      value: validHistory.length,
      note: 'Recorded movement ledger entries',
      color: 'var(--gold)',
    },
  ];

  return (
    <div className="commissiondar-stock-page">
      <div style={{ marginBottom: 24 }}>
        <p className="dashboard-eyebrow">COMMISSIONDAR / INVENTORY</p>
        <h1 style={{ margin: '4px 0 8px' }}>Stock Movements & Yard Ledger</h1>
        <p style={{ color: 'var(--muted)', margin: 0 }}>
          Manage grain intake from your farmers and track deliveries to rice mills.
        </p>
      </div>

      {error && (
        <div className="panel form-error" role="alert" style={{ padding: 14, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {message && (
        <div className="panel" role="status" style={{ padding: 14, marginBottom: 16, color: 'var(--green-light)', borderLeft: '4px solid var(--green)' }}>
          {message}
        </div>
      )}

      {/* Summary Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 16,
          marginBottom: 26,
        }}
      >
        {summaries.map(item => (
          <div className="panel" key={item.label} style={{ padding: 22, borderRadius: 16, border: '1px solid var(--border)' }}>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 6px', fontWeight: 600 }}>
              {item.label}
            </p>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.9rem', color: item.color }}>
              {item.value}
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>
              {item.note}
            </p>
          </div>
        ))}
      </div>

      {/* 2-column layout for Receive & Deliver forms */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20, marginBottom: 26 }}>
        {/* Receive Stock Form */}
        <div className="panel" style={{ padding: 24, borderRadius: 18, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 24 }}>📥</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Receive Grain from Farmer</h2>
              <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
                Incoming stock from your farmer accounts.
              </p>
            </div>
          </div>

          <form onSubmit={handleReceive} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <SearchableSelect
                id="receiveFarmer"
                label="Farmer Name *"
                placeholder="Search farmer by name..."
                options={farmerOptions}
                value={farmerId}
                onChange={id => setFarmerId(id)}
                disabled={busy}
                required
              />
            </div>

            <div>
              <SearchableSelect
                id="receiveGrain"
                label="Custom Grain Variety"
                placeholder="Select grain type (optional)..."
                options={grainOptions}
                value={receiveGrainTypeId}
                onChange={id => setReceiveGrainTypeId(id)}
                disabled={busy}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                  Quantity (Units) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  placeholder="e.g. 150"
                  value={receiveQuantity}
                  onChange={e => setReceiveQuantity(e.target.value)}
                  disabled={busy}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                  Rate (₹ / Unit)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 2150"
                  value={receiveRate}
                  onChange={e => setReceiveRate(e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={busy} style={{ minHeight: 46, marginTop: 4 }}>
              {busy ? 'Recording...' : '📥 Record Grain Intake'}
            </button>
          </form>
        </div>

        {/* Deliver Stock Form */}
        <div className="panel" style={{ padding: 24, borderRadius: 18, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 24 }}>📤</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Deliver Grain to Mill</h2>
              <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
                Dispatch stock to a destination rice mill.
              </p>
            </div>
          </div>

          <form onSubmit={handleDeliver} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              {millOptions.length > 0 ? (
                <SearchableSelect
                  id="deliverMill"
                  label="Destination Rice Mill *"
                  placeholder="Select from My Mills or type..."
                  options={millOptions}
                  value={millName}
                  onChange={name => setMillName(name)}
                  disabled={busy}
                  required
                />
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                    Mill Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sri Lakshmi Srinivasa Mill"
                    value={millName}
                    onChange={e => setMillName(e.target.value)}
                    disabled={busy}
                  />
                </div>
              )}
            </div>

            <div>
              <SearchableSelect
                id="deliverGrain"
                label="Custom Grain Variety"
                placeholder="Select grain type (optional)..."
                options={grainOptions}
                value={deliverGrainTypeId}
                onChange={id => setDeliverGrainTypeId(id)}
                disabled={busy}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                  Quantity (Units) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  placeholder="e.g. 200"
                  value={deliverQuantity}
                  onChange={e => setDeliverQuantity(e.target.value)}
                  disabled={busy}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                  Agreed Rate (₹ / Unit)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 2200"
                  value={deliverRate}
                  onChange={e => setDeliverRate(e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={busy} style={{ minHeight: 46, marginTop: 4 }}>
              {busy ? 'Recording...' : '📤 Record Mill Delivery'}
            </button>
          </form>
        </div>
      </div>

      {/* Movement Ledger History Table */}
      <div className="panel" style={{ padding: 24, borderRadius: 18, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0 }}>Stock Movement History</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>
              Chronological log of grain received from farmers and delivered to mills.
            </p>
          </div>

          <button type="button" className="btn btn-ghost" onClick={loadStock} disabled={loading || busy}>
            {loading ? 'Refreshing...' : '↻ Refresh'}
          </button>
        </div>

        {loading ? (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 24 }}>Loading movement ledger...</p>
        ) : validHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 36 }}>
            <p style={{ fontSize: 32, margin: 0 }}>📦</p>
            <h3 style={{ margin: '12px 0 6px' }}>No stock movements recorded</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
              Use the intake or delivery form above to record your first stock movement.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Movement Type</th>
                  <th>Party / Destination</th>
                  <th>Grain Variety</th>
                  <th>Quantity</th>
                  <th>Rate</th>
                  <th>Calculated Amount</th>
                </tr>
              </thead>
              <tbody>
                {validHistory.map((item, index) => {
                  const isDelivery = item.type === 'deliver' || item.movement_type === 'deliver' || Number(item.quantity) < 0;
                  const partyName = item.mill_name || (item.farmer_id ? farmerMap[item.farmer_id] || `Farmer #${item.farmer_id}` : 'General Stock');
                  const grainName = item.grain_type_name || (item.grain_type_id ? grainTypeMap[item.grain_type_id] || `Variety #${item.grain_type_id}` : 'Standard Paddy');
                  const qtyVal = Math.abs(Number(item.quantity || 0));
                  const rateVal = item.rate != null ? Number(item.rate) : null;
                  const amtVal = item.amount != null ? Number(item.amount) : (rateVal ? qtyVal * rateVal : null);

                  return (
                    <tr key={item.id ?? index}>
                      <td>{formatDate(item.created_at || item.date || item.timestamp)}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: isDelivery ? 'rgba(56, 189, 248, 0.15)' : 'rgba(0, 201, 120, 0.15)',
                            color: isDelivery ? 'var(--cyan)' : 'var(--green-glow)',
                            borderColor: isDelivery ? 'rgba(56, 189, 248, 0.35)' : 'rgba(0, 201, 120, 0.35)',
                          }}
                        >
                          {isDelivery ? '📤 Delivered' : '📥 Received'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 650, color: 'var(--ink)' }}>{partyName}</td>
                      <td>{grainName}</td>
                      <td style={{ fontWeight: 700, color: isDelivery ? 'var(--cyan)' : 'var(--green-light)' }}>
                        {isDelivery ? '-' : '+'}{quantity(qtyVal)}
                      </td>
                      <td>{rateVal ? money(rateVal) : '—'}</td>
                      <td style={{ fontWeight: 750, color: 'var(--gold)' }}>
                        {amtVal ? money(amtVal) : '—'}
                      </td>
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
}
