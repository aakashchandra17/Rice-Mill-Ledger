
import { useCallback, useEffect, useState } from 'react';
import {
  getCommissiondarStock,
  describeError,
} from '../api';
import { useAuth } from '../context/AuthContext';

const quantity = value =>
  Number(value || 0).toLocaleString('en-IN');

const money = value =>
  '₹' + Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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

  return labels[type] || (type || 'Unknown').replaceAll('_', ' ');
};

export default function MyLedger() {
  const { token } = useAuth();

  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      description: 'Current stock balance',
    },
    {
      label: 'Total Received',
      value: quantity(totalReceived),
      description: 'Stock received from farmers',
    },
    {
      label: 'Total Delivered',
      value: quantity(totalDelivered),
      description: 'Stock delivered to mill',
    },
    {
      label: 'Total Transactions',
      value: validHistory.length,
      description: 'Active stock movements',
    },
  ];

  return (
    <div className="commissiondar-stock-page">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 22,
        }}
      >
        <div>
          <h1>My Stock Ledger</h1>
          <p style={{ color: 'var(--muted)' }}>
            Track stock received, delivered and currently available.
          </p>
        </div>

        <button
          type="button"
          onClick={loadStock}
          disabled={loading}
        >
          {loading ? 'Loading...' : '↻ Refresh'}
        </button>
      </div>

      {error && (
        <div
          className="panel form-error"
          role="alert"
          style={{ padding: 14, marginBottom: 18 }}
        >
          {error}
        </div>
      )}

      {loading && !stock ? (
        <div className="panel" style={{ padding: 22 }}>
          Loading your stock ledger...
        </div>
      ) : stock ? (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: 14,
              marginBottom: 24,
            }}
          >
            {summaries.map(item => (
              <div
                className="panel"
                key={item.label}
                style={{ padding: 20 }}
              >
                <p style={{ color: 'var(--muted)', marginTop: 0 }}>
                  {item.label}
                </p>

                <h2 style={{ margin: '8px 0' }}>
                  {item.value}
                </h2>

                <small style={{ color: 'var(--muted)' }}>
                  {item.description}
                </small>
              </div>
            ))}
          </div>

          <div className="panel" style={{ padding: 20 }}>
            <div style={{ marginBottom: 18 }}>
              <h2 style={{ margin: 0 }}>Stock History</h2>
              <p style={{ color: 'var(--muted)', marginBottom: 0 }}>
                Your complete stock movement records.
              </p>
            </div>

            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 25 }}>
                <p style={{ fontSize: 28 }}>📦</p>
                <h3>No stock transactions found</h3>
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
                    {history.map((item, index) => {
                      const isReceived = Number(item.quantity) > 0;
                      const isVoided = item.is_void;

                      return (
                        <tr key={item.id ?? index}>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {formatDate(item.created_at)}
                          </td>

                          <td>
                            <span style={{ fontWeight: 600 }}>
                              {movementLabel(item.movement_type)}
                            </span>
                          </td>

                          <td>{item.farmer_id ?? '—'}</td>

                          <td>
                            <span
                              style={{
                                fontWeight: 700,
                                color: isVoided
                                  ? 'var(--muted)'
                                  : isReceived
                                    ? 'var(--green)'
                                    : '#d77b65',
                              }}
                            >
                              {isReceived ? '+' : ''}
                              {quantity(item.quantity)}
                            </span>
                          </td>

                          <td style={{ whiteSpace: 'nowrap' }}>
                            {money(item.rate)}
                          </td>

                          <td>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '5px 10px',
                                borderRadius: 20,
                                fontSize: 12,
                                fontWeight: 600,
                                background: isVoided
                                  ? 'rgba(180, 100, 80, 0.15)'
                                  : 'rgba(40, 160, 100, 0.15)',
                                color: isVoided
                                  ? '#d77b65'
                                  : 'var(--green)',
                              }}
                            >
                              {isVoided ? 'Voided' : 'Active'}
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
        </>
      ) : null}
    </div>
  );
}
