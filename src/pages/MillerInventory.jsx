import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getMillerInventory,
  getMillerInventoryMovements,
  describeError,
} from '../api';
import { useAuth } from '../context/AuthContext';

const formatNumber = n => Number(n || 0).toLocaleString('en-IN');
const formatCurrency = n => {
  if (n === null || n === undefined || n === '') return '—';
  const num = Number(n);
  if (Number.isNaN(num)) return '—';
  return '₹' + num.toLocaleString('en-IN');
};

const formatDate = dateString => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return String(dateString);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const MOVEMENTS_PAGE_SIZE = 25;

export default function MillerInventory() {
  const { token } = useAuth();

  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive' | 'in_stock'

  // Selected Grain for Movements Drawer / Panel
  const [selectedItem, setSelectedItem] = useState(null);
  const [movements, setMovements] = useState([]);
  const [movementsTotal, setMovementsTotal] = useState(0);
  const [movementsOffset, setMovementsOffset] = useState(0);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementsError, setMovementsError] = useState('');

  // Load Inventory Summary directly from backend
  const loadInventory = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');

    try {
      const data = await getMillerInventory(token);
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.inventory)
        ? data.inventory
        : [];
      setInventory(list);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // Load Movements for Selected Grain
  const loadMovements = useCallback(
    async (item, offset = 0) => {
      if (!token || !item) return;
      setMovementsLoading(true);
      setMovementsError('');

      try {
        const res = await getMillerInventoryMovements(
          item.id,
          { limit: MOVEMENTS_PAGE_SIZE, offset },
          token
        );

        if (Array.isArray(res)) {
          setMovements(res);
          setMovementsTotal(res.length);
        } else if (res && typeof res === 'object') {
          const list = Array.isArray(res.movements) ? res.movements : [];
          setMovements(list);
          setMovementsTotal(
            typeof res.total === 'number' ? res.total : list.length
          );
        } else {
          setMovements([]);
          setMovementsTotal(0);
        }
        setMovementsOffset(offset);
      } catch (err) {
        setMovementsError(describeError(err));
      } finally {
        setMovementsLoading(false);
      }
    },
    [token]
  );

  // Trigger movement load when selected item changes
  const handleSelectItem = item => {
    setSelectedItem(item);
    setMovementsOffset(0);
    loadMovements(item, 0);
  };

  const handleCloseDetails = () => {
    setSelectedItem(null);
    setMovements([]);
    setMovementsError('');
  };

  // Pagination for movements
  const handleNextPage = () => {
    const nextOffset = movementsOffset + MOVEMENTS_PAGE_SIZE;
    if (nextOffset < movementsTotal) {
      loadMovements(selectedItem, nextOffset);
    }
  };

  const handlePrevPage = () => {
    const prevOffset = Math.max(0, movementsOffset - MOVEMENTS_PAGE_SIZE);
    loadMovements(selectedItem, prevOffset);
  };

  // Summary Metrics directly from backend inventory records
  const metrics = useMemo(() => {
    let totalReceived = 0;
    let totalDispatched = 0;
    let totalStock = 0;

    inventory.forEach(item => {
      totalReceived += Number(item.total_received || 0);
      totalDispatched += Number(item.total_dispatched || 0);
      totalStock += Number(item.available_stock || 0);
    });

    return {
      varietyCount: inventory.length,
      totalReceived,
      totalDispatched,
      totalStock,
    };
  }, [inventory]);

  // Filtered inventory list
  const filteredInventory = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inventory.filter(item => {
      const matchesSearch =
        !q ||
        item.name?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item.unit?.toLowerCase().includes(q);

      const isActive = item.is_active !== false;
      const stock = Number(item.available_stock || 0);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && isActive) ||
        (statusFilter === 'inactive' && !isActive) ||
        (statusFilter === 'in_stock' && stock > 0);

      return matchesSearch && matchesStatus;
    });
  }, [inventory, search, statusFilter]);

  return (
    <div className="miller-inventory-page">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p className="dashboard-eyebrow">MILLER / INVENTORY MANAGEMENT</p>
        <h1 style={{ margin: '4px 0 8px' }}>Mill Inventory & Stock Ledger</h1>
        <p style={{ color: 'var(--muted)', margin: 0 }}>
          Direct backend inventory levels, total intake received, outbound
          dispatches, and item-wise stock movement histories.
        </p>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div
          className="panel form-error"
          role="alert"
          style={{ padding: 14, marginBottom: 16 }}
        >
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          className="panel"
          style={{
            padding: 20,
            borderRadius: 16,
            border: '1px solid var(--border)',
          }}
        >
          <p
            style={{
              color: 'var(--muted)',
              fontSize: 13,
              margin: '0 0 6px',
              fontWeight: 600,
            }}
          >
            Tracked Varieties
          </p>
          <h2
            style={{
              margin: '0 0 4px',
              fontSize: '1.9rem',
              color: 'var(--ink)',
            }}
          >
            {metrics.varietyCount}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>
            Active & historical grains
          </p>
        </div>

        <div
          className="panel"
          style={{
            padding: 20,
            borderRadius: 16,
            border: '1px solid var(--border)',
          }}
        >
          <p
            style={{
              color: 'var(--muted)',
              fontSize: 13,
              margin: '0 0 6px',
              fontWeight: 600,
            }}
          >
            Total Received
          </p>
          <h2
            style={{
              margin: '0 0 4px',
              fontSize: '1.9rem',
              color: 'var(--green-light)',
            }}
          >
            {formatNumber(metrics.totalReceived)}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>
            Cumulative paddy intake
          </p>
        </div>

        <div
          className="panel"
          style={{
            padding: 20,
            borderRadius: 16,
            border: '1px solid var(--border)',
          }}
        >
          <p
            style={{
              color: 'var(--muted)',
              fontSize: 13,
              margin: '0 0 6px',
              fontWeight: 600,
            }}
          >
            Total Dispatched
          </p>
          <h2
            style={{
              margin: '0 0 4px',
              fontSize: '1.9rem',
              color: 'var(--cyan, #38bdf8)',
            }}
          >
            {formatNumber(metrics.totalDispatched)}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>
            Outbound sales & shipments
          </p>
        </div>

        <div
          className="panel"
          style={{
            padding: 20,
            borderRadius: 16,
            border: '1px solid var(--border)',
          }}
        >
          <p
            style={{
              color: 'var(--muted)',
              fontSize: 13,
              margin: '0 0 6px',
              fontWeight: 600,
            }}
          >
            Current Stock Available
          </p>
          <h2
            style={{
              margin: '0 0 4px',
              fontSize: '1.9rem',
              color: 'var(--gold, #f59e0b)',
            }}
          >
            {formatNumber(metrics.totalStock)}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>
            Net on-hand inventory
          </p>
        </div>
      </div>

      {/* Main Inventory Table Panel */}
      <div
        className="panel"
        style={{
          padding: 24,
          borderRadius: 18,
          border: '1px solid var(--border)',
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Grain Inventory Summary</h2>
            <p
              style={{
                color: 'var(--muted)',
                fontSize: 13,
                margin: '4px 0 0',
              }}
            >
              Real-time stock calculated by backend from verified intake and
              export movements.
            </p>
          </div>

          {/* Search & Filter Toolbar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              alignItems: 'center',
            }}
          >
            <input
              type="text"
              placeholder="Search inventory..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                maxWidth: 220,
                padding: '8px 12px',
                fontSize: '0.88rem',
              }}
            />

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                fontSize: '0.88rem',
              }}
            >
              <option value="all">All Varieties</option>
              <option value="in_stock">In Stock Only (&gt; 0)</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={loadInventory}
              disabled={loading}
              title="Refresh inventory"
              style={{ padding: '8px 14px', fontSize: '0.88rem' }}
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div
            style={{
              textAlign: 'center',
              padding: 40,
              color: 'var(--muted)',
            }}
          >
            <p style={{ fontSize: 28, margin: 0 }}>⏳</p>
            <p style={{ marginTop: 10 }}>Loading mill inventory...</p>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ fontSize: 32, margin: 0 }}>📦</p>
            <h3 style={{ margin: '12px 0 6px' }}>No inventory records found</h3>
            <p
              style={{
                color: 'var(--muted)',
                fontSize: 13,
                maxWidth: 400,
                margin: '0 auto',
              }}
            >
              {inventory.length === 0
                ? 'No grain varieties have been created or received in inventory yet.'
                : 'No inventory matches the selected search and filter criteria.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 14px' }}>
                    Grain Variety
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 14px' }}>
                    Category
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 14px' }}>
                    Unit
                  </th>
                  <th style={{ textAlign: 'right', padding: '12px 14px' }}>
                    Total Received
                  </th>
                  <th style={{ textAlign: 'right', padding: '12px 14px' }}>
                    Total Dispatched
                  </th>
                  <th style={{ textAlign: 'right', padding: '12px 14px' }}>
                    Available Stock
                  </th>
                  <th style={{ textAlign: 'center', padding: '12px 14px' }}>
                    Status
                  </th>
                  <th style={{ textAlign: 'right', padding: '12px 14px' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map(item => {
                  const isActive = item.is_active !== false;
                  const received = Number(item.total_received || 0);
                  const dispatched = Number(item.total_dispatched || 0);
                  const available = Number(item.available_stock || 0);
                  const isSelected = selectedItem?.id === item.id;

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        backgroundColor: isSelected
                          ? 'rgba(34, 197, 94, 0.08)'
                          : 'transparent',
                        opacity: isActive ? 1 : 0.75,
                      }}
                    >
                      <td style={{ padding: '14px', fontWeight: 650 }}>
                        <span
                          style={{
                            color: isActive ? 'var(--ink)' : 'var(--muted)',
                          }}
                        >
                          {item.name}
                        </span>
                      </td>
                      <td style={{ padding: '14px', color: 'var(--muted)' }}>
                        {item.category || '—'}
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: 'rgba(255, 255, 255, 0.06)',
                            fontSize: '0.82rem',
                            color: '#cbd5e1',
                          }}
                        >
                          {item.unit || 'quintal'}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '14px',
                          textAlign: 'right',
                          color: 'var(--green-light)',
                          fontWeight: 600,
                        }}
                      >
                        {formatNumber(received)}
                      </td>
                      <td
                        style={{
                          padding: '14px',
                          textAlign: 'right',
                          color: 'var(--cyan, #38bdf8)',
                          fontWeight: 600,
                        }}
                      >
                        {formatNumber(dispatched)}
                      </td>
                      <td
                        style={{
                          padding: '14px',
                          textAlign: 'right',
                          fontWeight: 750,
                          fontSize: '1.02rem',
                          color:
                            available > 0
                              ? 'var(--gold, #f59e0b)'
                              : available < 0
                              ? '#f87171'
                              : 'var(--muted)',
                        }}
                      >
                        {formatNumber(available)}
                      </td>
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 9px',
                            borderRadius: 12,
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            background: isActive
                              ? 'rgba(34, 197, 94, 0.15)'
                              : 'rgba(148, 163, 184, 0.15)',
                            color: isActive
                              ? 'var(--green-light)'
                              : 'var(--muted)',
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              backgroundColor: isActive
                                ? 'var(--green)'
                                : 'var(--muted)',
                            }}
                          />
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <button
                          type="button"
                          className={
                            isSelected
                              ? 'btn btn-primary'
                              : 'btn btn-secondary'
                          }
                          onClick={() => handleSelectItem(item)}
                          style={{
                            padding: '6px 14px',
                            fontSize: '0.82rem',
                          }}
                        >
                          {isSelected ? 'Viewing Movements' : 'Stock Movements'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Grain Movement History Panel */}
      {selectedItem && (
        <div
          className="panel"
          style={{
            padding: 24,
            borderRadius: 18,
            border: '1px solid var(--border)',
            background: 'var(--surface-soft, rgba(17, 24, 39, 0.8))',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
              marginBottom: 18,
              borderBottom: '1px solid var(--border)',
              paddingBottom: 16,
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 4,
                }}
              >
                <h2 style={{ margin: 0, fontSize: '1.3rem' }}>
                  Stock Movements: {selectedItem.name}
                </h2>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: 'rgba(255, 255, 255, 0.08)',
                    fontSize: '0.8rem',
                    color: '#cbd5e1',
                  }}
                >
                  {selectedItem.unit || 'quintal'}
                </span>
                <span
                  style={{
                    padding: '3px 9px',
                    borderRadius: 12,
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    background:
                      selectedItem.is_active !== false
                        ? 'rgba(34, 197, 94, 0.15)'
                        : 'rgba(148, 163, 184, 0.15)',
                    color:
                      selectedItem.is_active !== false
                        ? 'var(--green-light)'
                        : 'var(--muted)',
                  }}
                >
                  {selectedItem.is_active !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p
                style={{
                  color: 'var(--muted)',
                  fontSize: 13,
                  margin: 0,
                }}
              >
                Available balance:{' '}
                <strong style={{ color: 'var(--gold, #f59e0b)' }}>
                  {formatNumber(selectedItem.available_stock)}{' '}
                  {selectedItem.unit || 'quintal'}
                </strong>{' '}
                • Total Received: {formatNumber(selectedItem.total_received)} •
                Total Dispatched: {formatNumber(selectedItem.total_dispatched)}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => loadMovements(selectedItem, movementsOffset)}
                disabled={movementsLoading}
                style={{ padding: '6px 12px', fontSize: '0.84rem' }}
              >
                ↻ Refresh
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseDetails}
                style={{ padding: '6px 12px', fontSize: '0.84rem' }}
              >
                ✕ Close
              </button>
            </div>
          </div>

          {movementsError && (
            <div
              className="panel form-error"
              role="alert"
              style={{ padding: 12, marginBottom: 14 }}
            >
              {movementsError}
            </div>
          )}

          {movementsLoading ? (
            <div
              style={{
                textAlign: 'center',
                padding: 40,
                color: 'var(--muted)',
              }}
            >
              <p style={{ fontSize: 28, margin: 0 }}>⏳</p>
              <p style={{ marginTop: 10 }}>Loading stock movements...</p>
            </div>
          ) : movements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ fontSize: 32, margin: 0 }}>📜</p>
              <h3 style={{ margin: '12px 0 6px' }}>No movements recorded</h3>
              <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
                No intake receipts or export dispatches have been recorded for
                "{selectedItem.name}" yet.
              </p>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '12px 14px' }}>
                        Date & Time
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 14px' }}>
                        Movement Type
                      </th>
                      <th style={{ textAlign: 'right', padding: '12px 14px' }}>
                        Quantity
                      </th>
                      <th style={{ textAlign: 'right', padding: '12px 14px' }}>
                        Rate
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 14px' }}>
                        Party ID
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 14px' }}>
                        Broker ID
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 14px' }}>
                        Notes
                      </th>
                      <th style={{ textAlign: 'center', padding: '12px 14px' }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map(m => {
                      const isVoid = Boolean(m.is_void);
                      const isIntake =
                        String(m.movement_type || '')
                          .toLowerCase()
                          .includes('intake') ||
                        String(m.movement_type || '')
                          .toLowerCase()
                          .includes('receive');

                      return (
                        <tr
                          key={m.id || `${m.created_at}-${m.quantity}`}
                          style={{
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            backgroundColor: isVoid
                              ? 'rgba(239, 68, 68, 0.06)'
                              : 'transparent',
                            opacity: isVoid ? 0.6 : 1,
                            textDecoration: isVoid ? 'line-through' : 'none',
                          }}
                        >
                          <td
                            style={{
                              padding: '12px 14px',
                              fontSize: '0.88rem',
                              color: '#cbd5e1',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatDate(m.created_at || m.date)}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontSize: '0.8rem',
                                fontWeight: 650,
                                textTransform: 'capitalize',
                                background: isIntake
                                  ? 'rgba(34, 197, 94, 0.15)'
                                  : 'rgba(56, 189, 248, 0.15)',
                                color: isIntake
                                  ? 'var(--green-light)'
                                  : 'var(--cyan, #38bdf8)',
                              }}
                            >
                              {m.movement_type || 'Movement'}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: '12px 14px',
                              textAlign: 'right',
                              fontWeight: 700,
                              color: isIntake
                                ? 'var(--green-light)'
                                : 'var(--cyan, #38bdf8)',
                            }}
                          >
                            {isIntake ? '+' : '-'}
                            {formatNumber(m.quantity)}{' '}
                            <span
                              style={{
                                fontSize: '0.78rem',
                                color: 'var(--muted)',
                                fontWeight: 400,
                              }}
                            >
                              {selectedItem.unit || 'units'}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: '12px 14px',
                              textAlign: 'right',
                              color: '#e2e8f0',
                            }}
                          >
                            {formatCurrency(m.rate)}
                          </td>
                          <td
                            style={{
                              padding: '12px 14px',
                              color: 'var(--muted)',
                              fontSize: '0.88rem',
                            }}
                          >
                            {m.party_id ? `#${m.party_id}` : '—'}
                          </td>
                          <td
                            style={{
                              padding: '12px 14px',
                              color: 'var(--muted)',
                              fontSize: '0.88rem',
                            }}
                          >
                            {m.broker_id ? `#${m.broker_id}` : '—'}
                          </td>
                          <td
                            style={{
                              padding: '12px 14px',
                              color: 'var(--muted)',
                              fontSize: '0.86rem',
                              maxWidth: 180,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={m.notes || ''}
                          >
                            {m.notes || '—'}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            {isVoid ? (
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '3px 8px',
                                  borderRadius: 6,
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  background: 'rgba(239, 68, 68, 0.2)',
                                  color: '#fca5a5',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                }}
                              >
                                🚫 VOIDED
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '3px 8px',
                                  borderRadius: 6,
                                  fontSize: '0.76rem',
                                  fontWeight: 600,
                                  background: 'rgba(34, 197, 94, 0.1)',
                                  color: 'var(--green-light)',
                                }}
                              >
                                ✓ Valid
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: 8,
                }}
              >
                <span style={{ fontSize: '0.86rem', color: 'var(--muted)' }}>
                  Showing {movementsOffset + 1} to{' '}
                  {Math.min(
                    movementsOffset + movements.length,
                    movementsTotal || movements.length
                  )}{' '}
                  of {movementsTotal || movements.length} movements
                </span>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handlePrevPage}
                    disabled={movementsOffset === 0 || movementsLoading}
                    style={{ padding: '6px 14px', fontSize: '0.84rem' }}
                  >
                    ← Previous
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleNextPage}
                    disabled={
                      movementsOffset + MOVEMENTS_PAGE_SIZE >= movementsTotal ||
                      movementsLoading
                    }
                    style={{ padding: '6px 14px', fontSize: '0.84rem' }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
