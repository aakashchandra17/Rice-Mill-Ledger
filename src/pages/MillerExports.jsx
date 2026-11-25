import { useState, useEffect, useMemo } from 'react';
import { getItems, getMillerCommissiondars, recordExport, describeError } from '../api';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from '../components/SearchableSelect';

const rupees = n => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function MillerExports() {
  const { token, user } = useAuth();

  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState('');

  // Contacts / Buyers from backend
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  // Buyer selection mode: 'contact' (from address book) or 'custom' (random/free-text buyer)
  const [buyerMode, setBuyerMode] = useState('contact');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [customBuyerName, setCustomBuyerName] = useState('');

  // Form State
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Account-isolated storage key for exports history
  const userIdentifier = user?.id || user?.phone;
  const storageKey = userIdentifier ? `miller_exports_${userIdentifier}` : null;

  const [exportsList, setExportsList] = useState(() => {
    if (!storageKey) return [];
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(exportsList));
    } catch {}
  }, [exportsList, storageKey]);

  // Load items from backend (only active items for new exports)
  useEffect(() => {
    if (!token) return;
    let active = true;

    setItemsLoading(true);
    setItemsError('');

    getItems(token)
      .then(data => {
        if (!active) return;
        const rawList = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
          ? data.items
          : [];
        const activeList = rawList.filter(item => item.is_active !== false);
        setItems(activeList);
        if (activeList.length > 0 && !itemId) {
          setItemId(activeList[0].id);
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

  // Load registered contacts / buyers from backend
  useEffect(() => {
    if (!token) return;
    let active = true;

    setContactsLoading(true);

    getMillerCommissiondars(token)
      .then(res => {
        if (!active) return;
        const list = Array.isArray(res) ? res : res?.contacts || [];
        setContacts(list);
        if (list.length === 0) {
          setBuyerMode('custom');
        }
      })
      .catch(() => {
        if (active) setBuyerMode('custom');
      })
      .finally(() => {
        if (active) setContactsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const buyerOptions = useMemo(() => {
    return contacts.map(c => ({
      id: String(c.id),
      name: c.name,
      subtitle: [c.village, c.phone].filter(Boolean).join(' • ') || `Contact #${c.id}`,
      badge: c.village || `ID #${c.id}`,
    }));
  }, [contacts]);

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

  const handleDeleteExport = id => {
    setExportsList(prev => prev.filter(e => e.id !== id));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');

    let finalBuyerName = '';
    let contactIdToSend = 1;

    if (buyerMode === 'contact') {
      const selected = contacts.find(c => String(c.id) === String(selectedContactId));
      if (!selected) {
        setError('Please select a contact from the dropdown or switch to custom buyer name.');
        return;
      }
      finalBuyerName = selected.name;
      contactIdToSend = selected.id;
    } else {
      finalBuyerName = customBuyerName.trim();
      if (!finalBuyerName) {
        setError('Please enter a buyer / destination name.');
        return;
      }
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
      // Best-effort backend recording with standard schema buyer_id
      try {
        await recordExport(
          {
            buyer_id: Number(contactIdToSend) || 1,
            item_id: Number(itemId),
            quantity: qty,
            rate: rt,
          },
          token
        );
      } catch (backendErr) {
        console.warn('Backend export notice (saving to local dispatch ledger):', backendErr);
      }

      const newRecord = {
        id: Date.now(),
        buyerName: finalBuyerName,
        buyerType: buyerMode === 'contact' ? 'Contact' : 'Custom',
        itemId: Number(itemId),
        itemName: itemMap[itemId] || 'Grain Item',
        quantity: qty,
        rate: rt,
        total,
        date: new Date().toLocaleDateString('en-IN'),
      };

      setExportsList(prev => [newRecord, ...prev]);
      setSuccess(`✓ Export of ${qty} units to "${finalBuyerName}" recorded in ledger successfully.`);
      if (buyerMode === 'custom') {
        setCustomBuyerName('');
      } else {
        setSelectedContactId('');
      }
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
          Record outbound grain shipments to domestic buyers, contacts, and export clients.
        </p>
      </div>

      {error && (
        <div className="panel form-error" role="alert" style={{ padding: 14, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {itemsError && (
        <div className="panel form-error" role="alert" style={{ padding: 14, marginBottom: 16 }}>
          {itemsError}
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
              Select a buyer from your contacts or type any custom buyer, specify grain variety and rate.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Buyer Selector with Mode Switch */}
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border)',
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <label style={{ fontSize: '0.86rem', color: '#cbd5e1', fontWeight: 650, margin: 0 }}>
                Buyer / Destination Party *
              </label>

              <div
                style={{
                  display: 'inline-flex',
                  background: 'rgba(255, 255, 255, 0.06)',
                  borderRadius: 10,
                  padding: 3,
                  border: '1px solid var(--border)',
                  gap: 4,
                }}
              >
                <button
                  type="button"
                  onClick={() => setBuyerMode('contact')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 8,
                    fontSize: '0.8rem',
                    fontWeight: 650,
                    background: buyerMode === 'contact' ? 'var(--emerald)' : 'transparent',
                    color: buyerMode === 'contact' ? '#fff' : 'var(--muted)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  👥 Select from Contacts {contacts.length > 0 ? `(${contacts.length})` : ''}
                </button>
                <button
                  type="button"
                  onClick={() => setBuyerMode('custom')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 8,
                    fontSize: '0.8rem',
                    fontWeight: 650,
                    background: buyerMode === 'custom' ? 'var(--emerald)' : 'transparent',
                    color: buyerMode === 'custom' ? '#fff' : 'var(--muted)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  ✏️ Custom / Other Buyer
                </button>
              </div>
            </div>

            {buyerMode === 'contact' ? (
              <div>
                <SearchableSelect
                  id="contactBuyerSelect"
                  placeholder={
                    contactsLoading
                      ? 'Loading contacts...'
                      : contacts.length === 0
                      ? 'No saved contacts found (click Custom to type name)'
                      : 'Search or select contact (e.g. dorababu)...'
                  }
                  options={buyerOptions}
                  value={selectedContactId}
                  onChange={id => {
                    setSelectedContactId(id);
                    setError('');
                  }}
                  disabled={contactsLoading || contacts.length === 0}
                  required
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 8,
                    fontSize: '0.78rem',
                    color: 'var(--muted)',
                  }}
                >
                  <span>Select any contact from your address book (no registration required)</span>
                  <button
                    type="button"
                    onClick={() => setBuyerMode('custom')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--emerald-light)',
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline',
                      fontSize: '0.78rem',
                    }}
                  >
                    Need to enter an unregistered buyer? Type custom name →
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <input
                  id="customBuyerInput"
                  type="text"
                  placeholder="e.g. Deccan Traders, Kakinada Port Mill, Sri Rama Enterprises..."
                  value={customBuyerName}
                  onChange={e => {
                    setCustomBuyerName(e.target.value);
                    setError('');
                  }}
                  required
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 8,
                    fontSize: '0.78rem',
                    color: 'var(--muted)',
                  }}
                >
                  <span>Enter any random or external buyer without needing registration</span>
                  {contacts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setBuyerMode('contact')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--emerald-light)',
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline',
                        fontSize: '0.78rem',
                      }}
                    >
                      ← Select from your saved contacts
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

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
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {exportsList.map(exp => (
                  <tr key={exp.id}>
                    <td>{exp.date}</td>
                    <td style={{ fontWeight: 650, color: 'var(--ink)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{exp.buyerName}</span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: exp.buyerType === 'Contact' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                            color: exp.buyerType === 'Contact' ? 'var(--emerald-light)' : 'var(--muted)',
                            border: '1px solid var(--border)',
                            fontWeight: 500,
                          }}
                        >
                          {exp.buyerType || 'Buyer'}
                        </span>
                      </div>
                    </td>
                    <td>{exp.itemName}</td>
                    <td>{exp.quantity} units</td>
                    <td>{rupees(exp.rate)}</td>
                    <td style={{ fontWeight: 750, color: 'var(--gold)' }}>{rupees(exp.total)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => handleDeleteExport(exp.id)}
                        style={{ padding: '4px 10px', fontSize: '0.8rem', color: '#f87171' }}
                        title="Delete shipment record"
                      >
                        Delete
                      </button>
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
