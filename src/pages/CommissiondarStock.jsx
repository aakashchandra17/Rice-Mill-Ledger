
import { useCallback, useEffect, useState } from 'react';
import {
  getCommissiondarStock,
  receiveCommissiondarStock,
  deliverCommissiondarStock,
  describeError,
} from '../api';
import { useAuth } from '../context/AuthContext';

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
    try {
      setLoading(true);
      setError('');
      const result = await getCommissiondarStock(token);
      setStock(result);
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
    setBusy(true);

    try {
      const payload = {
        farmer_id: Number(farmerId),
        item_id: Number(receiveItemId),
        quantity: Number(receiveQuantity),
      };

      if (receiveRate !== '') payload.rate = Number(receiveRate);

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

  const history = Array.isArray(stock?.history) ? stock.history : [];
  const stockOnHand = stock?.stock_on_hand;

  return (
    <div className="panel">
      <h1>My Stock Ledger</h1>
      <p>Track stock received from farmers and delivered to mills.</p>

      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      <h2>Current Stock</h2>
      {loading ? (
        <p>Loading stock...</p>
      ) : Array.isArray(stockOnHand) ? (
        stockOnHand.length === 0 ? (
          <p>No stock currently recorded.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  {Object.keys(stockOnHand[0]).map(key => (
                    <th key={key}>{formatLabel(key)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stockOnHand.map((item, index) => (
                  <tr key={item.id ?? index}>
                    {Object.keys(stockOnHand[0]).map(key => (
                      <td key={key}>{String(item[key] ?? '—')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : stockOnHand && typeof stockOnHand === 'object' ? (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <tbody>
              {Object.entries(stockOnHand).map(([key, value]) => (
                <tr key={key}>
                  <th>{formatLabel(key)}</th>
                  <td>{String(value ?? '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>Stock information is not available in the expected format.</p>
      )}

      <h2 style={{ marginTop: 28 }}>Receive Stock from a Farmer</h2>
      <form onSubmit={handleReceive} style={formStyle}>
        <label>
          Farmer ID
          <input
            type="number"
            min="1"
            required
            value={farmerId}
            onChange={e => setFarmerId(e.target.value)}
          />
        </label>
        <label>
          Item ID
          <input
            type="number"
            min="1"
            required
            value={receiveItemId}
            onChange={e => setReceiveItemId(e.target.value)}
          />
        </label>
        <label>
          Quantity
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={receiveQuantity}
            onChange={e => setReceiveQuantity(e.target.value)}
          />
        </label>
        <label>
          Rate (optional)
          <input
            type="number"
            min="0"
            step="0.01"
            value={receiveRate}
            onChange={e => setReceiveRate(e.target.value)}
          />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? 'Please wait...' : 'Receive Stock'}
        </button>
      </form>

      <h2 style={{ marginTop: 28 }}>Deliver Stock to a Mill</h2>
      <form onSubmit={handleDeliver} style={formStyle}>
        <label>
          Business ID
          <input
            type="number"
            min="1"
            required
            value={businessId}
            onChange={e => setBusinessId(e.target.value)}
          />
        </label>
        <label>
          Item ID
          <input
            type="number"
            min="1"
            required
            value={deliverItemId}
            onChange={e => setDeliverItemId(e.target.value)}
          />
        </label>
        <label>
          Quantity
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={deliverQuantity}
            onChange={e => setDeliverQuantity(e.target.value)}
          />
        </label>
        <label>
          Rate
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={deliverRate}
            onChange={e => setDeliverRate(e.target.value)}
          />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? 'Please wait...' : 'Deliver Stock'}
        </button>
      </form>

      <h2 style={{ marginTop: 28 }}>Stock History</h2>
      {loading ? (
        <p>Loading history...</p>
      ) : history.length === 0 ? (
        <p>No stock history found.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                {Object.keys(history[0]).map(key => (
                  <th key={key}>{formatLabel(key)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((entry, index) => (
                <tr key={entry.id ?? index}>
                  {Object.keys(history[0]).map(key => (
                    <td key={key}>{String(entry[key] ?? '—')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatLabel(value) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

const formStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'end',
  gap: 12,
  marginBottom: 20,
};
