import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  getCommissiondarStock,
  receiveCommissiondarStock,
  deliverCommissiondarStock,
  getCommissiondarFarmers,
  getCommissiondarGrainTypes,
  getCommissiondarMills,
  describeError,
} from '../api';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from '../components/SearchableSelect';
import GrainSiloContainer from '../components/GrainSiloContainer';
import {
  TrendingUpIcon,
  InwardArrowIcon,
  OutwardArrowIcon,
  ClipboardLedgerIcon,
} from '../components/AgriIcons';

const quantity = value =>
  Number(value || 0).toLocaleString('en-IN');

const money = value =>
  '₹' + Number(value || 0).toLocaleString('en-IN');

const formatDate = value => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

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
  const [mills, setMills] = useState([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Tab: 'overview' | 'receive' | 'deliver' | 'history'
  const [activeTab, setActiveTab] = useState('overview');

  // Receive Form State
  const [receiveFarmerId, setReceiveFarmerId] = useState('');
  const [receiveGrainTypeId, setReceiveGrainTypeId] = useState('');
  const [receiveQuantity, setReceiveQuantity] = useState('');
  const [receiveRate, setReceiveRate] = useState('');

  // Deliver Form State
  const [deliverFarmerId, setDeliverFarmerId] = useState('');
  const [deliverMillName, setDeliverMillName] = useState('');
  const [customMillName, setCustomMillName] = useState('');
  const [deliverGrainTypeId, setDeliverGrainTypeId] = useState('');
  const [deliverQuantity, setDeliverQuantity] = useState('');
  const [deliverRate, setDeliverRate] = useState('');

  // Load stock and aux data
  const loadStock = useCallback(async () => {
    if (!token) return;
    try {
      const result = await getCommissiondarStock(token);
      setStock(result || {});
    } catch (err) {
      setError(describeError(err));
    }
  }, [token]);

  const loadAuxData = useCallback(async () => {
    if (!token) return;
    try {
      const [fData, gData, mData] = await Promise.allSettled([
        getCommissiondarFarmers(token),
        getCommissiondarGrainTypes(token),
        getCommissiondarMills(token, false),
      ]);

      if (fData.status === 'fulfilled') {
        const list = Array.isArray(fData.value)
          ? fData.value
          : fData.value?.farmers || [];
        setFarmers(list);
      }
      if (gData.status === 'fulfilled') {
        const list = Array.isArray(gData.value)
          ? gData.value
          : gData.value?.grain_types || [];
        setGrainTypes(list);
      }
      if (mData.status === 'fulfilled') {
        const list = Array.isArray(mData.value)
          ? mData.value
          : mData.value?.mills || [];
        setMills(list);
      }
    } catch {
      // non-blocking
    }
  }, [token]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadStock(), loadAuxData()]).finally(() => setLoading(false));
  }, [loadStock, loadAuxData]);

  // Maps for quick lookup by ID
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

  // Options for Dropdowns
  const farmerOptions = useMemo(() => {
    return farmers.map(f => ({
      id: String(f.id),
      name: f.name,
      subtitle: f.village ? `Village: ${f.village}` : 'Farmer',
      badge: f.phone || undefined,
    }));
  }, [farmers]);

  const grainOptions = useMemo(() => {
    return grainTypes.map(g => ({
      id: String(g.id),
      name: g.name,
      subtitle: `Unit: ${g.unit || 'quintal'}`,
      badge: g.unit || undefined,
    }));
  }, [grainTypes]);

  const millOptions = useMemo(() => {
    const options = mills
      .filter(m => m.is_active !== false)
      .map(m => ({
        id: m.name,
        name: m.name,
        subtitle: `Mill #${m.id}`,
        badge: 'My Mills',
      }));

    options.push({
      id: '__custom__',
      name: '✍️ Enter Custom Mill Name...',
      subtitle: 'Type a mill name not in directory',
    });

    return options;
  }, [mills]);

  // Raw history of movements
  const history = useMemo(() => {
    const list = Array.isArray(stock?.history) ? stock.history : [];
    return list.filter(item => typeof item === 'object' && item !== null);
  }, [stock]);

  // Calculate Available Stock by Grain Type from history
  const stockByGrain = useMemo(() => {
    const summary = {};

    grainTypes.forEach(g => {
      summary[g.id] = {
        grainId: g.id,
        grainName: g.name,
        unit: g.unit || 'quintal',
        received: 0,
        delivered: 0,
        available: 0,
      };
    });

    history.forEach(m => {
      const gId = m.grain_type_id || m.grainTypeId || m.item_id;
      const mType = String(m.movement_type || m.type || '').toLowerCase();
      const isReceive =
        mType === 'receive' ||
        mType === 'received_from_farmer' ||
        mType.includes('receive') ||
        mType.includes('inward');
      const isDeliver =
        mType === 'deliver' ||
        mType === 'delivered_to_mill' ||
        mType.includes('deliver') ||
        mType.includes('dispatch') ||
        mType.includes('outward');
      const qty = Math.abs(Number(m.quantity || 0));

      if (gId) {
        if (!summary[gId]) {
          summary[gId] = {
            grainId: gId,
            grainName: m.grain_name || m.grainName || grainTypeMap[gId] || `Grain #${gId}`,
            unit: m.unit || 'quintal',
            received: 0,
            delivered: 0,
            available: 0,
          };
        }
        if (isReceive) {
          summary[gId].received += qty;
        } else if (isDeliver) {
          summary[gId].delivered += qty;
        }
        summary[gId].available = Math.max(0, summary[gId].received - summary[gId].delivered);
      }
    });

    return Object.values(summary);
  }, [grainTypes, history, grainTypeMap]);

  // Calculate Deliveries Grouped by Mill from history
  const deliveriesByMill = useMemo(() => {
    const map = {};

    history.forEach(m => {
      const mType = String(m.movement_type || m.type || '').toLowerCase();
      const isDeliver =
        mType === 'deliver' ||
        mType === 'delivered_to_mill' ||
        mType.includes('deliver') ||
        mType.includes('dispatch') ||
        mType.includes('outward');
      if (!isDeliver) return;

      const mName = m.mill_name || m.millName || 'Unspecified Mill';
      const qty = Math.abs(Number(m.quantity || 0));

      if (!map[mName]) {
        map[mName] = {
          millName: mName,
          deliveriesCount: 0,
          totalQuantity: 0,
        };
      }

      map[mName].deliveriesCount += 1;
      map[mName].totalQuantity += qty;
    });

    return Object.values(map);
  }, [history]);

  // Yard stock metrics
  const totalReceived = Number(stock?.total_received ?? stock?.received ?? stock?.totalReceived ?? 0);
  const totalDelivered = Number(stock?.total_delivered ?? stock?.delivered ?? stock?.totalDelivered ?? 0);
  const currentStock = Number(
    stock?.current_stock !== undefined && stock?.current_stock !== null && stock.current_stock > 0
      ? stock.current_stock
      : Math.max(0, totalReceived - totalDelivered)
  );

  const [selectedSiloGrainId, setSelectedSiloGrainId] = useState('all');

  const siloGrains = useMemo(() => {
    const list = [{
      id: 'all',
      name: 'All Yard Crops',
      available: currentStock,
      stock: currentStock,
      unit: 'quintal',
      received: totalReceived,
      dispatched: totalDelivered,
    }];

    stockByGrain.forEach(g => {
      list.push({
        id: String(g.grainId),
        name: g.grainName,
        available: g.available,
        stock: g.available,
        unit: g.unit || 'quintal',
        received: g.received,
        dispatched: g.delivered,
      });
    });

    return list;
  }, [currentStock, totalReceived, totalDelivered, stockByGrain]);

  const activeSiloGrain = useMemo(() => {
    if (selectedSiloGrainId === 'all') return siloGrains[0];
    return siloGrains.find(g => String(g.id) === String(selectedSiloGrainId)) || siloGrains[0];
  }, [siloGrains, selectedSiloGrainId]);

  // Available stock for selected delivery grain
  const availableForSelectedGrain = useMemo(() => {
    if (!deliverGrainTypeId) {
      // Return total stock if no specific grain selected
      return currentStock;
    }
    const found = stockByGrain.find(g => String(g.grainId) === String(deliverGrainTypeId));
    if (found && (found.received > 0 || found.available > 0)) {
      return found.available;
    }
    return currentStock;
  }, [deliverGrainTypeId, stockByGrain, currentStock]);

  // Handle Receive Stock Submission
  async function handleReceive(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    const fId = Number(receiveFarmerId);
    const qty = Number(receiveQuantity);

    if (!Number.isInteger(fId) || fId <= 0 || !Number.isFinite(qty) || qty <= 0) {
      setError('Please select a farmer and enter a positive quantity.');
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

      setMessage(`✓ Received ${quantity(qty)} units into yard successfully.`);
      setReceiveFarmerId('');
      setReceiveGrainTypeId('');
      setReceiveQuantity('');
      setReceiveRate('');
      await loadStock();
      setActiveTab('overview');
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  // Handle Deliver Stock Submission with validation
  async function handleDeliver(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    const fId = Number(deliverFarmerId);
    const qty = Number(deliverQuantity);
    const finalMillName =
      deliverMillName === '__custom__' ? customMillName.trim() : deliverMillName.trim();

    if (!Number.isInteger(fId) || fId <= 0) {
      setError('Please select a Farmer from your network.');
      return;
    }

    if (!finalMillName) {
      setError('Please select or specify a Mill Name.');
      return;
    }

    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Please enter a positive delivery quantity.');
      return;
    }

    // Validation: prevent delivery exceeding available stock
    if (qty > availableForSelectedGrain) {
      setError(
        `Delivery quantity (${quantity(qty)}) exceeds available stock (${quantity(availableForSelectedGrain)}) for this grain.`
      );
      return;
    }

    setBusy(true);

    try {
      const payload = {
        farmer_id: fId,
        mill_name: finalMillName,
        quantity: qty,
      };

      if (deliverGrainTypeId) {
        payload.grain_type_id = Number(deliverGrainTypeId);
      }
      if (deliverRate !== '') {
        payload.rate = Number(deliverRate);
      }

      await deliverCommissiondarStock(payload, token);

      setMessage(`✓ Delivered ${quantity(qty)} units to ${finalMillName} successfully.`);
      setDeliverFarmerId('');
      setDeliverMillName('');
      setCustomMillName('');
      setDeliverGrainTypeId('');
      setDeliverQuantity('');
      setDeliverRate('');
      await loadStock();
      setActiveTab('overview');
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="commissiondar-stock-page" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <p className="dashboard-eyebrow">COMMISSIONDAR / INVENTORY & DISPATCHES</p>
        <h1 style={{ margin: '4px 0 8px' }}>Stock Receiving, Delivery & Yard Ledger</h1>
        <p style={{ color: 'var(--muted)', margin: 0 }}>
          Receive grain from network farmers, dispatch to partner rice mills, and monitor yard stock balances.
        </p>
      </div>

      {error && (
        <div className="panel form-error" role="alert" style={{ padding: 14, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {message && (
        <div
          className="panel"
          role="status"
          style={{
            padding: 14,
            marginBottom: 16,
            color: 'var(--green-light)',
            borderLeft: '4px solid var(--green)',
          }}
        >
          {message}
        </div>
      )}

      {/* 2D Animated Yard Storage Silo */}
      <GrainSiloContainer
        title="Commissiondar Yard Storage Silo"
        grainName={activeSiloGrain.name}
        currentStock={activeSiloGrain.available}
        unit={activeSiloGrain.unit || 'quintal'}
        totalReceived={activeSiloGrain.received || totalReceived}
        totalDelivered={activeSiloGrain.dispatched || totalDelivered}
        subtext="Live physical inventory in yard awaiting rice mill dispatch"
        availableGrains={siloGrains.length > 1 ? siloGrains : []}
        selectedGrainId={selectedSiloGrainId}
        onSelectGrain={setSelectedSiloGrainId}
      />

      {/* Top 4 Stock Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div className="panel" style={{ padding: 20, borderRadius: 16 }}>
          <div style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 4 }}>
            CURRENT YARD STOCK
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--green-light)' }}>
            {quantity(currentStock)} Qtl / Bags
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
            Available for mill dispatch
          </div>
        </div>

        <div className="panel" style={{ padding: 20, borderRadius: 16 }}>
          <div style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 4 }}>
            TOTAL RECEIVED
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--gold)' }}>
            {quantity(totalReceived)} Qtl
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
            Inflow from network farmers
          </div>
        </div>

        <div className="panel" style={{ padding: 20, borderRadius: 16 }}>
          <div style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 4 }}>
            TOTAL DELIVERED
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#60a5fa' }}>
            {quantity(totalDelivered)} Qtl
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
            Outflow dispatched to mills
          </div>
        </div>

        <div className="panel" style={{ padding: 20, borderRadius: 16 }}>
          <div style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 4 }}>
            RECORDED MOVEMENTS
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--ink)' }}>
            {history.length}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
            Audited ledger transactions
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          borderBottom: '1px solid var(--border)',
          paddingBottom: 12,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('overview')}
        >
          <TrendingUpIcon size={16} /> Stock Overview & Breakdown
        </button>

        <button
          type="button"
          className={`btn ${activeTab === 'receive' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('receive')}
        >
          <InwardArrowIcon size={16} /> Receive Stock from Farmer
        </button>

        <button
          type="button"
          className={`btn ${activeTab === 'deliver' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('deliver')}
        >
          <OutwardArrowIcon size={16} /> Deliver Stock to Mill
        </button>

        <button
          type="button"
          className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('history')}
        >
          <ClipboardLedgerIcon size={16} /> Movement History ({history.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW & GROUPINGS */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gap: 24 }}>
          {/* Stock by Grain Type */}
          <div className="panel" style={{ padding: 24, borderRadius: 18 }}>
            <h3 style={{ margin: '0 0 6px' }}>Stock Grouped by Grain Type</h3>
            <p style={{ color: 'var(--muted)', margin: '0 0 16px', fontSize: '0.85rem' }}>
              Real-time balance of inventory per registered crop variety.
            </p>

            {stockByGrain.length === 0 ? (
              <p style={{ color: 'var(--muted)', margin: 0 }}>No custom grain types added yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.82rem' }}>
                      <th style={{ padding: '10px 14px' }}>GRAIN VARIETY</th>
                      <th style={{ padding: '10px 14px' }}>UNIT</th>
                      <th style={{ padding: '10px 14px' }}>TOTAL RECEIVED</th>
                      <th style={{ padding: '10px 14px' }}>TOTAL DELIVERED</th>
                      <th style={{ padding: '10px 14px' }}>CURRENT AVAILABLE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockByGrain.map(g => (
                      <tr key={g.grainId} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 650 }}>{g.grainName}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{g.unit}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--gold)' }}>{quantity(g.received)}</td>
                        <td style={{ padding: '10px 14px', color: '#60a5fa' }}>{quantity(g.delivered)}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: g.available > 0 ? 'var(--green-light)' : 'var(--muted)' }}>
                          {quantity(g.available)} {g.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Deliveries by Mill */}
          <div className="panel" style={{ padding: 24, borderRadius: 18 }}>
            <h3 style={{ margin: '0 0 6px' }}>Deliveries Grouped by Mill</h3>
            <p style={{ color: 'var(--muted)', margin: '0 0 16px', fontSize: '0.85rem' }}>
              Cumulative quantities dispatched to each partner rice mill.
            </p>

            {deliveriesByMill.length === 0 ? (
              <p style={{ color: 'var(--muted)', margin: 0 }}>No deliveries recorded yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.82rem' }}>
                      <th style={{ padding: '10px 14px' }}>MILL NAME</th>
                      <th style={{ padding: '10px 14px' }}>TOTAL DISPATCHES</th>
                      <th style={{ padding: '10px 14px' }}>TOTAL QUANTITY DELIVERED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveriesByMill.map(d => (
                      <tr key={d.millName} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 650 }}>{d.millName}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{d.deliveriesCount} shipments</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--green-light)' }}>
                          {quantity(d.totalQuantity)} Qtl
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RECEIVE STOCK FORM */}
      {activeTab === 'receive' && (
        <div className="panel" style={{ padding: 24, borderRadius: 18, border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 6px' }}>Receive Stock from Farmer</h3>
          <p style={{ color: 'var(--muted)', margin: '0 0 20px', fontSize: '0.85rem' }}>
            Record grain intake into your yard from a registered farmer.
          </p>

          <form onSubmit={handleReceive}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                gap: 16,
                marginBottom: 20,
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                  Farmer *
                </label>
                <SearchableSelect
                  options={farmerOptions}
                  value={receiveFarmerId}
                  onChange={setReceiveFarmerId}
                  placeholder="Select or search farmer..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                  Grain Type (Optional)
                </label>
                <SearchableSelect
                  options={grainOptions}
                  value={receiveGrainTypeId}
                  onChange={setReceiveGrainTypeId}
                  placeholder="Select grain type..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                  Quantity (Qtl / Bags) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 100"
                  value={receiveQuantity}
                  onChange={e => setReceiveQuantity(e.target.value)}
                  required
                  disabled={busy}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                  Rate per Unit (₹) (Optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 2150"
                  value={receiveRate}
                  onChange={e => setReceiveRate(e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={busy || !receiveFarmerId || !receiveQuantity}
                style={{ minHeight: 44, padding: '0 26px' }}
              >
                {busy ? 'Recording Intake...' : 'Confirm Stock Receive'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: DELIVER STOCK FORM */}
      {activeTab === 'deliver' && (
        <div className="panel" style={{ padding: 24, borderRadius: 18, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
            <div>
              <h3 style={{ margin: '0 0 6px' }}>Deliver Stock to Rice Mill</h3>
              <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.85rem' }}>
                Dispatch stock from your yard to a partner rice mill.
              </p>
            </div>

            {/* Prominent Available Stock Banner */}
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '8px 16px',
                borderRadius: 12,
                fontSize: '0.88rem',
              }}
            >
              <span style={{ color: 'var(--muted)' }}>Available Stock: </span>
              <strong style={{ color: 'var(--green-light)', fontSize: '1rem' }}>
                {quantity(availableForSelectedGrain)} Qtl / Bags
              </strong>
            </div>
          </div>

          <form onSubmit={handleDeliver}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                gap: 16,
                marginBottom: 20,
              }}
            >
              {/* 1. Farmer Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                  Farmer *
                </label>
                <SearchableSelect
                  options={farmerOptions}
                  value={deliverFarmerId}
                  onChange={setDeliverFarmerId}
                  placeholder="Select source farmer..."
                />
              </div>

              {/* 2. Mill Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                  Destination Mill *
                </label>
                <SearchableSelect
                  options={millOptions}
                  value={deliverMillName}
                  onChange={setDeliverMillName}
                  placeholder="Select from My Mills or custom..."
                />
              </div>

              {/* Custom Mill Name if selected */}
              {deliverMillName === '__custom__' && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                    Type Custom Mill Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter full mill name"
                    value={customMillName}
                    onChange={e => setCustomMillName(e.target.value)}
                    required
                    disabled={busy}
                  />
                </div>
              )}

              {/* 3. Grain Type */}
              <div>
                <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                  Grain Type (Optional)
                </label>
                <SearchableSelect
                  options={grainOptions}
                  value={deliverGrainTypeId}
                  onChange={setDeliverGrainTypeId}
                  placeholder="Select grain type..."
                />
              </div>

              {/* 4. Delivery Quantity with validation feedback */}
              <div>
                <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                  Delivery Quantity *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={availableForSelectedGrain > 0 ? availableForSelectedGrain : undefined}
                  placeholder={`Max: ${quantity(availableForSelectedGrain)}`}
                  value={deliverQuantity}
                  onChange={e => setDeliverQuantity(e.target.value)}
                  required
                  disabled={busy}
                />
                {Number(deliverQuantity) > availableForSelectedGrain && availableForSelectedGrain > 0 && (
                  <p style={{ color: '#ef4444', fontSize: '0.78rem', margin: '4px 0 0' }}>
                    ⚠ Quantity exceeds available stock ({quantity(availableForSelectedGrain)} Qtl)!
                  </p>
                )}
              </div>

              {/* 5. Rate */}
              <div>
                <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                  Rate per Unit (₹) (Optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 2250"
                  value={deliverRate}
                  onChange={e => setDeliverRate(e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  busy ||
                  !deliverFarmerId ||
                  !(deliverMillName === '__custom__' ? customMillName.trim() : deliverMillName.trim()) ||
                  !deliverQuantity ||
                  (availableForSelectedGrain > 0 && Number(deliverQuantity) > availableForSelectedGrain)
                }
                style={{ minHeight: 44, padding: '0 26px' }}
              >
                {busy ? 'Recording Delivery...' : 'Confirm Stock Delivery'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: MOVEMENT HISTORY */}
      {activeTab === 'history' && (
        <div className="panel" style={{ padding: 24, borderRadius: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Stock Movement History ({history.length})</h3>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={loadStock}
              disabled={busy}
            >
              ↻ Refresh History
            </button>
          </div>

          {history.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
              No stock movements recorded yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.82rem' }}>
                    <th style={{ padding: '12px 14px' }}>TYPE</th>
                    <th style={{ padding: '12px 14px' }}>DATE</th>
                    <th style={{ padding: '12px 14px' }}>FARMER NAME</th>
                    <th style={{ padding: '12px 14px' }}>MILL NAME</th>
                    <th style={{ padding: '12px 14px' }}>GRAIN VARIETY</th>
                    <th style={{ padding: '12px 14px' }}>QUANTITY</th>
                    <th style={{ padding: '12px 14px' }}>RATE</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item, index) => {
                    const mType = String(item.movement_type || item.type || '').toLowerCase();
                    const isReceive =
                      mType === 'receive' ||
                      mType === 'received_from_farmer' ||
                      mType.includes('receive') ||
                      mType.includes('inward');
                    const fName =
                      farmerMap[item.farmer_id] ||
                      item.farmer_name ||
                      item.farmerName ||
                      (item.farmer_id ? `Farmer #${item.farmer_id}` : '—');
                    const mName = item.mill_name || item.millName || (isReceive ? '—' : 'Partner Mill');
                    const gName =
                      grainTypeMap[item.grain_type_id || item.item_id] ||
                      item.grain_name ||
                      item.grainName ||
                      'Standard Grain';

                    return (
                      <tr key={item.id || index} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: isReceive
                                ? 'rgba(16, 185, 129, 0.15)'
                                : 'rgba(59, 130, 246, 0.15)',
                              color: isReceive ? 'var(--green-light)' : '#60a5fa',
                            }}
                          >
                            {isReceive ? '↓ RECEIVED' : '↑ DELIVERED'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: '0.85rem' }}>
                          {formatDate(item.created_at || item.date)}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 650 }}>{fName}</td>
                        <td style={{ padding: '12px 14px', color: isReceive ? 'var(--muted)' : 'var(--ink)' }}>
                          {mName}
                        </td>
                        <td style={{ padding: '12px 14px' }}>{gName}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700 }}>
                          {quantity(item.quantity)} Qtl
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--gold)' }}>
                          {item.rate ? money(item.rate) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
