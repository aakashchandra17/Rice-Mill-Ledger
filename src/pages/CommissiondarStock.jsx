
import { useCallback, useEffect, useState } from 'react';
import {
  getCommissiondarStock,
  receiveCommissiondarStock,
  deliverCommissiondarStock,
  describeError,
} from '../api';
import { useAuth } from '../context/AuthContext';

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

const movementLabel = type => {
  const labels = {
    received_from_farmer: 'Received from Farmer',
    delivered_to_mill: 'Delivered to Mill',
  };

  return labels[type] || 'Other Movement';
};

export default function CommissiondarStock() {
  const { token } = useAuth();

  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [farmerId, setFarmerId] = useState('');
  const [receiveItemId, setReceiveItemId] = useState('');
  const [receiveQuantity, setReceiveQuantity] = useState('');
  const [receiveRate, setReceiveRate] = useState('');

  const [businessId, setBusinessId] = useState('');
  const [deliverItemId, setDeliverItemId] = useState('');
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

  useEffect(() => {
    loadStock();
  }, [loadStock]);

  async function handleReceive(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (
      !Number.isInteger(Number(farmerId)) ||
      Number(farmerId) <= 0 ||
      !Number.isInteger(Number(receiveItemId)) ||
      Number(receiveItemId) <= 0 ||
      Number(receiveQuantity) <= 0
    ) {
      setError('Enter valid Farmer ID, Item ID and Quantity.');
      return;
    }

    setBusy(true);

    try {
      const payload = {
        farmer_id: Number(farmerId),
        item_id: Number(receiveItemId),
        quantity: Number(receiveQuantity),
      };

      if (receiveRate !== '') {
        payload.rate = Number(receiveRate);
      }

      await receiveCommissiondarStock(payload, token);

      setMessage('Stock received successfully.');
      setFarmerId('');
      setReceiveItemId('');
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

    if (
      !Number.isInteger(Number(businessId)) ||
      Number(businessId) <= 0 ||
      !Number.isInteger(Number(deliverItemId)) ||
      Number(deliverItemId) <= 0 ||
      Number(deliverQuantity) <= 0 ||
      Number(deliverRate) < 0
    ) {
      setError('Enter valid Business ID, Item ID, Quantity and Rate.');
      return;
    }

    setBusy(true);

    try {
      await deliverCommissiondarStock(
        {
          business_id: Number(businessId),
          item_id: Number(deliverItemId),
          quantity: Number(deliverQuantity),
          rate: Number(deliverRate),
        },
        token
      );

      setMessage('Stock delivery recorded successfully.');
      setBusinessId('');
      setDeliverItemId('');
      setDeliverQuantity('');
      setDeliverRate('');
      await loadStock();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  const history = Array.isArray(stock?.history)
    ? stock.history
    : [];

  const validHistory = history.filter(item => !item.is_void);

  const totalReceived = validHistory
    .filter(item => Number(item.quantity) > 0)
    .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  const totalDelivered = validHistory
    .filter(item => Number(item.quantity) < 0)
    .reduce((sum, item) => sum + Math.abs(Number(item.quantity || 0)), 0);

  const summaries = [
    {
      label: 'Available Stock',
      value: quantity(stock?.stock_on_hand),
    },
    {
      label: 'Total Received',
      value: quantity(totalReceived),
    },
    {
      label: 'Total Delivered',
      value: quantity(totalDelivered),
    },
    {
      label: 'Transactions',
      value: validHistory.length,
    },
  ];

  const inputStyle = {
    width: '100%',
    padding: '11px 12px',
    marginTop: 7,
    borderRadius: 8,
    border: '1px solid var(--border, #ccc)',
    boxSizing: 'border-box',
  };

  const formStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    alignItems: 'end',
    gap: 16,
    marginBottom: 20,
  };

  const cardStyle = {
    padding: 20,
    borderRadius: 12,
    marginBottom: 22,
  };

  return (
    <div className="commissiondar-stock-page">
      <div style={{ marginBottom: 22 }}>
        <h1>My Stock Ledger</h1>
        <p style={{ color: 'var(--muted)' }}>
          Manage stock received from farmers and delivered to mills.
        </p>
      </div>

      {error && (
        <div className="panel form-error" role="alert" style={{ padding: 14, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {message && (
        <div className="panel" role="status" style={{ padding: 14, marginBottom: 16, color: 'var(--green)' }}>
          {message}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
          marginBottom: 24,
        }}
      >
        {summaries.map(item => (
          <div className="panel" key={item.label} style={{ padding: 20 }}>
            <p style={{ color: 'var(--muted)', marginTop: 0 }}>
              {item.label}
            </p>
            <h2 style={{ marginBottom: 0 }}>{item.value}</h2>
          </div>
        ))}
      </div>

      <div className="panel" style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Receive Stock from a Farmer</h2>

        <form onSubmit={handleReceive} style={formStyle}>
          <label>
            <b>Farmer ID</b>
            <input style={inputStyle} type="number" min="1" required value={farmerId} onChange={e => setFarmerId(e.target.value)} disabled={busy} />
          </label>

          <label>
            <b>Item ID</b>
            <input style={inputStyle} type="number" min="1" required value={receiveItemId} onChange={e => setReceiveItemId(e.target.value)} disabled={busy} />
          </label>

          <label>
            <b>Quantity</b>
            <input style={inputStyle} type="number" min="0.01" step="0.01" required value={receiveQuantity} onChange={e => setReceiveQuantity(e.target.value)} disabled={busy} />
          </label>

          <label>
            <b>Rate (optional)</b>
            <input style={inputStyle} type="number" min="0" step="0.01" value={receiveRate} onChange={e => setReceiveRate(e.target.value)} disabled={busy} />
          </label>

          <button type="submit" disabled={busy}>
            {busy ? 'Please wait...' : 'Receive Stock'}
          </button>
        </form>
      </div>

      <div className="panel" style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Deliver Stock to a Mill</h2>

        <form onSubmit={handleDeliver} style={formStyle}>
          <label>
            <b>Business ID</b>
            <input style={inputStyle} type="number" min="1" required value={businessId} onChange={e => setBusinessId(e.target.value)} disabled={busy} />
          </label>

          <label>
            <b>Item ID</b>
            <input style={inputStyle} type="number" min="1" required value={deliverItemId} onChange={e => setDeliverItemId(e.target.value)} disabled={busy} />
          </label>

          <label>
            <b>Quantity</b>
            <input style={inputStyle} type="number" min="0.01" step="0.01" required value={deliverQuantity} onChange={e => setDeliverQuantity(e.target.value)} disabled={busy} />
          </label>

          <label>
            <b>Rate</b>
            <input style={inputStyle} type="number" min="0" step="0.01" required value={deliverRate} onChange={e => setDeliverRate(e.target.value)} disabled={busy} />
          </label>

          <button type="submit" disabled={busy}>
            {busy ? 'Please wait...' : 'Deliver Stock'}
          </button>
        </form>
      </div>

      <div className="panel" style={{ padding: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Stock History</h2>
            <p style={{ color: 'var(--muted)', marginBottom: 0 }}>
              Your stock movement records.
            </p>
          </div>

          <button type="button" onClick={loadStock} disabled={loading || busy}>
            {loading ? 'Loading...' : '↻ Refresh'}
          </button>
        </div>

        {loading && !stock ? (
          <p>Loading history...</p>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 25 }}>
            <p style={{ fontSize: 28 }}>📦</p>
            <h3>No stock history found</h3>
            <p style={{ color: 'var(--muted)' }}>
              Your stock movements will appear here.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 650 }}>
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Movement</th>
                  <th>Farmer ID</th>
                  <th>Quantity</th>
                  <th>Rate</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {history.map((entry, index) => {
                  const received = Number(entry.quantity) > 0;

                  return (
                    <tr key={entry.id ?? index}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {formatDate(entry.created_at)}
                      </td>

                      <td style={{ fontWeight: 600 }}>
                        {movementLabel(entry.movement_type)}
                      </td>

                      <td>{entry.farmer_id ?? '—'}</td>

                      <td>
                        <strong
                          style={{
                            color: entry.is_void
                              ? 'var(--muted)'
                              : received
                                ? 'var(--green)'
                                : '#c65b48',
                          }}
                        >
                          {received ? '+' : ''}
                          {quantity(entry.quantity)}
                        </strong>
                      </td>

                      <td style={{ whiteSpace: 'nowrap' }}>
                        {money(entry.rate)}
                      </td>

                      <td>
                        <span
                          style={{
                            padding: '5px 10px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                            color: entry.is_void ? '#c65b48' : 'var(--green)',
                            background: entry.is_void
                              ? 'rgba(198,91,72,0.12)'
                              : 'rgba(40,160,100,0.12)',
                          }}
                        >
                          {entry.is_void ? 'Voided' : 'Active'}
                        </span>
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
