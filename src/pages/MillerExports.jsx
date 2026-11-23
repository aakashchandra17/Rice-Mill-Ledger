import { useState, useEffect, useMemo } from 'react';
import { getItems, recordExport, describeError } from '../api';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from '../components/SearchableSelect';

const rupees = n => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function MillerExports() {
  const { token, user } = useAuth();

  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState('');

  // Form State
  const [buyerName, setBuyerName] = useState('');
  const [buyerId, setBuyerId] = useState('1'); // Defaults to buyer id 1 for backend schema
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Local storage key for exports history per user
  const storageKey = `miller_exports_${user?.id || user?.phone || 'default'}`;
  const [exportsList, setExportsList] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(exportsList));
    } catch {}
  }, [exportsList, storageKey]);

  // Load items from backend
  useEffect(() => {
    if (!token) return;
    let active = true;

    setItemsLoading(true);
    setItemsError('');

    getItems(token)
      .then(data => {
        if (!active) return;
        const list = Array.isArray(data?.items) ? data.items : [];
        setItems(list);
        if (list.length > 0 && !itemId) {
          setItemId(list[0].id);
        }
      })
      .catch(err => {
        if (active) setItemsError(describeError(err));
      })
      .finally(() => {
        if (active) setItemsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const itemOptions = useMemo(() => {
    return items.map(item => ({
      id: item.id,
      name: item.name,
      subtitle: [item.category, item.unit].filter(Boolean).join(' • ') || 'Grain Item',
      badge: item.unit || undefined,
    }));
  }, [items]);

  const itemMap = useMemo(() => {
    const map = {};
    items.forEach(i => {
      map[i.id] = i.name;
    });
    return map;
  }, [items]);

  const qty = Number(quantity);
  const rt = Number(rate);
  const total = qty > 0 && rt > 0 ? Math.round(qty * rt * 100) / 100 : 0;

  // Summary Metrics
  const metrics = useMemo(() => {
    let totalQty = 0;
    let totalValue = 0;

    exportsList.forEach(exp => {
      totalQty += Number(exp.quantity || 0);
      totalValue += Number(exp.total || 0);
    });

    return {
      shipmentCount: exportsList.length,
      totalQty,
      totalValue,
    };
  }, [exportsList]);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!buyerName.trim()) {
      setError('Please enter a buyer / destination name.');
      return;
    }

    if (!itemId) {
      setError('Please select a grain item.');
      return;
    }

    if (!(qty > 0) || !(rt > 0)) {
      setError('Please enter a valid quantity and export rate.');
      return;
    }

    setSaving(true);

    try {
      await recordExport(
        {
          buyer_id: Number(buyerId) || 1,
          item_id: Number(itemId),
          quantity: qty,
          rate: rt,
        },
        token
      );

      const newRecord = {
        id: Date.now(),
        buyerName: buyerName.trim(),
        itemId: Number(itemId),
        itemName: itemMap[itemId] || 'Grain Item',
        quantity: qty,
        rate: rt,
        total,
        date: new Date().toLocaleDateString('en-IN'),
      };

      setExportsList(prev => [newRecord, ...prev]);
      setSuccess(`✓ Export of ${qty} units to "${buyerName.trim()}" recorded successfully.`);
      setBuyerName('');
      setQuantity('');
      setRate('');
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="miller-exports-page">
      <div style={{ marginBottom: 24 }}>
        <p className="dashboard-eyebrow">MILLER / SALES & LOGISTICS</p>
        <h1 style={{ margin: '4px 0 8px' }}>Exports & Rice Shipments</h1>
        <p style={{ color: 'var(--muted)', margin: 0 }}>
          Record outbound grain shipments to domestic buyers and export clients.
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

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 26,
        }}
      >
        <div className="panel" style={{ padding: 22, borderRadius: 16, border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 6px', fontWeight: 600 }}>Total Shipments</p>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.9rem', color: 'var(--ink)' }}>{metrics.shipmentCount}</h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>Outbound dispatches recorded</p>
        </div>

        <div className="panel" style={{ padding: 22, borderRadius: 16, border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 6px', fontWeight: 600 }}>Export Quantity</p>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.9rem', color: 'var(--cyan)' }}>{metrics.totalQty.toLocaleString('en-IN')} units</h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>Total grain exported</p>
        </div>

        <div className="panel" style={{ padding: 22, borderRadius: 16, border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 6px', fontWeight: 600 }}>Total Export Value</p>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.9rem', color: 'var(--gold)' }}>{rupees(metrics.totalValue)}</h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>Gross export billing</p>
        </div>
      </div>

      {/* Record Export Form */}
      <div className="panel" style={{ padding: 26, borderRadius: 18, border: '1px solid var(--border)', marginBottom: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <span style={{ fontSize: 24 }}>🚢</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Record Outbound Export Shipment</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
              Specify buyer details, grain variety, and rate per unit.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
              alignItems: 'end',
              marginBottom: 16,
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                Buyer / Destination Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Deccan Traders / Kakinada Port"
                value={buyerName}
                onChange={e => setBuyerName(e.target.value)}
                required
              />
            </div>

            <div>
              <SearchableSelect
                id="exportItem"
                label="Paddy / Rice Item *"
                placeholder={itemsLoading ? 'Loading grain items...' : 'Search grain variety...'}
                options={itemOptions}
                value={itemId}
                onChange={id => setItemId(id)}
                disabled={itemsLoading || items.length === 0}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                Quantity (Units) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 500"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                Rate per Unit (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 3400"
                value={rate}
                onChange={e => setRate(e.target.value)}
                required
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 18px',
              borderRadius: 12,
              background: 'var(--surface-soft)',
              border: '1px solid var(--border)',
              marginBottom: 18,
            }}
          >
            <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Estimated Shipment Value</span>
            <strong style={{ fontSize: '1.3rem', color: 'var(--gold)' }}>{rupees(total)}</strong>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || itemsLoading || items.length === 0}
            style={{ minHeight: 46 }}
          >
            {saving ? 'Recording Export...' : 'Record Export Shipment'}
          </button>
        </form>
      </div>

      {/* Export History Table */}
      <div className="panel" style={{ padding: 24, borderRadius: 18, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0 }}>Export Dispatch Ledger</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>
              Historical shipments recorded for your rice mill account.
            </p>
          </div>
        </div>

        {exportsList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 36 }}>
            <p style={{ fontSize: 32, margin: 0 }}>🚢</p>
            <h3 style={{ margin: '12px 0 6px' }}>No export shipments recorded</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
              Record outbound dispatches above to track your export shipments and billing.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Buyer / Destination</th>
                  <th>Grain Item</th>
                  <th>Quantity</th>
                  <th>Rate</th>
                  <th>Total Billing</th>
                </tr>
              </thead>
              <tbody>
                {exportsList.map(exp => (
                  <tr key={exp.id}>
                    <td>{exp.date}</td>
                    <td style={{ fontWeight: 650, color: 'var(--ink)' }}>{exp.buyerName}</td>
                    <td>{exp.itemName}</td>
                    <td>{exp.quantity} units</td>
                    <td>{rupees(exp.rate)}</td>
                    <td style={{ fontWeight: 750, color: 'var(--gold)' }}>{rupees(exp.total)}</td>
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
