import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from '../components/SearchableSelect';

const rupees = n => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function CommissiondarLedger() {
  const { user } = useAuth();

  const userKey = user?.id || user?.phone || 'default';
  const millsStorageKey = `commissiondar_mills_${userKey}`;
  const ledgerStorageKey = `commissiondar_ledger_${userKey}`;

  // Load My Mills
  const mills = useMemo(() => {
    try {
      const saved = localStorage.getItem(millsStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }, [millsStorageKey]);

  const millOptions = useMemo(() => {
    return mills
      .filter(m => m.isActive !== false)
      .map(m => ({
        id: m.name,
        name: m.name,
        subtitle: m.location ? `Location: ${m.location}` : 'Rice Mill',
        badge: 'Mill',
      }));
  }, [mills]);

  // Load Ledger records: array of { id, type: 'accrual'|'receipt', millName, amount, date, notes, rate, quantity }
  const [entries, setEntries] = useState(() => {
    try {
      const saved = localStorage.getItem(ledgerStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(ledgerStorageKey, JSON.stringify(entries));
    } catch {}
  }, [entries, ledgerStorageKey]);

  // Active Tab: 'recordAccrual' | 'recordReceipt'
  const [formType, setFormType] = useState('accrual');
  const [selectedMill, setSelectedMill] = useState('');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Auto-calculate amount for accrual if qty and rate provided
  useEffect(() => {
    if (formType === 'accrual' && quantity && rate) {
      const calc = Number(quantity) * Number(rate);
      if (!Number.isNaN(calc) && calc > 0) {
        setAmount(String(calc));
      }
    }
  }, [quantity, rate, formType]);

  // Mill-wise metrics
  const millLedgers = useMemo(() => {
    const summary = {};

    entries.forEach(entry => {
      const mName = entry.millName || 'Other Mill';
      if (!summary[mName]) {
        summary[mName] = {
          millName: mName,
          accrued: 0,
          received: 0,
          pending: 0,
          entries: [],
        };
      }

      const amt = Number(entry.amount || 0);
      if (entry.type === 'accrual') {
        summary[mName].accrued += amt;
      } else {
        summary[mName].received += amt;
      }
      summary[mName].pending = summary[mName].accrued - summary[mName].received;
      summary[mName].entries.push(entry);
    });

    return Object.values(summary);
  }, [entries]);

  const totals = useMemo(() => {
    let accrued = 0;
    let received = 0;

    entries.forEach(entry => {
      const amt = Number(entry.amount || 0);
      if (entry.type === 'accrual') accrued += amt;
      else received += amt;
    });

    return {
      accrued,
      received,
      pending: accrued - received,
    };
  }, [entries]);

  const handleSubmit = e => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedMill) {
      setError('Please select a mill name.');
      return;
    }

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    const newEntry = {
      id: `ledg_${Date.now()}`,
      type: formType,
      millName: selectedMill,
      amount: amt,
      quantity: quantity ? Number(quantity) : null,
      rate: rate ? Number(rate) : null,
      notes: notes.trim() || (formType === 'accrual' ? 'Commission Accrual' : 'Payment Received'),
      date: new Date().toLocaleDateString('en-IN'),
    };

    setEntries(prev => [newEntry, ...prev]);
    setSuccess(`✓ ${formType === 'accrual' ? 'Commission accrual' : 'Receipt'} of ${rupees(amt)} recorded.`);
    setAmount('');
    setQuantity('');
    setRate('');
    setNotes('');
  };

  return (
    <div className="commissiondar-ledger-page">
      <div style={{ marginBottom: 24 }}>
        <p className="dashboard-eyebrow">COMMISSIONDAR / FINANCIAL LEDGER</p>
        <h1 style={{ margin: '4px 0 8px' }}>Manual Mill Commission Ledger</h1>
        <p style={{ color: 'var(--muted)', margin: 0 }}>
          Record commission earned from rice mills, track payment receipts, and reconcile pending balances.
        </p>
      </div>

      {success && (
        <div className="panel" role="status" style={{ padding: 14, marginBottom: 16, color: 'var(--green-light)', borderLeft: '4px solid var(--green)' }}>
          {success}
        </div>
      )}

      {error && (
        <div className="panel form-error" role="alert" style={{ padding: 14, marginBottom: 16 }}>
          {error}
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
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 6px', fontWeight: 600 }}>Total Commission Earned</p>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.9rem', color: 'var(--gold)' }}>{rupees(totals.accrued)}</h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>Accrued from all mill deliveries</p>
        </div>

        <div className="panel" style={{ padding: 22, borderRadius: 16, border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 6px', fontWeight: 600 }}>Total Receipts Collected</p>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.9rem', color: 'var(--green-light)' }}>{rupees(totals.received)}</h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>Payments settled by mills</p>
        </div>

        <div className="panel" style={{ padding: 22, borderRadius: 16, border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 6px', fontWeight: 600 }}>Pending Commission Due</p>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.9rem', color: totals.pending > 0 ? '#fca5a5' : 'var(--green-light)' }}>
            {rupees(totals.pending)}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>Outstanding to be recovered</p>
        </div>
      </div>

      {/* Entry Recording Form */}
      <div className="panel" style={{ padding: 24, borderRadius: 18, border: '1px solid var(--border)', marginBottom: 26 }}>
        {/* Toggle between Accrual vs Receipt */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button
            type="button"
            className={formType === 'accrual' ? 'btn btn-primary' : 'btn btn-ghost'}
            onClick={() => setFormType('accrual')}
          >
            + Record Commission Earned
          </button>

          <button
            type="button"
            className={formType === 'receipt' ? 'btn btn-primary' : 'btn btn-ghost'}
            onClick={() => setFormType('receipt')}
          >
            ✓ Record Commission Receipt Received
          </button>
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
              <SearchableSelect
                id="ledgerMill"
                label="Select Rice Mill *"
                placeholder="Search mill name..."
                options={millOptions}
                value={selectedMill}
                onChange={name => setSelectedMill(name)}
                required
              />
            </div>

            {formType === 'accrual' ? (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                    Quantity (Bags/Units)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 100"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                    Commission Rate (₹ per unit)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 5"
                    value={rate}
                    onChange={e => setRate(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                    Total Commission Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    placeholder="e.g. 500"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    required
                  />
                </div>
              </>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                  Receipt Amount Received (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="e.g. 10000"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                Notes / Reference
              </label>
              <input
                type="text"
                placeholder={formType === 'accrual' ? 'e.g. Truck AP-16 delivery' : 'e.g. NEFT transfer #4829'}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ minHeight: 46 }}>
            {formType === 'accrual' ? 'Record Commission Accrual' : 'Record Receipt Payment'}
          </button>
        </form>
      </div>

      {/* Mill-wise Summary Table */}
      <div className="panel" style={{ padding: 24, borderRadius: 18, border: '1px solid var(--border)', marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 16px' }}>Mill Balance Balances Summary</h2>

        {millLedgers.length === 0 ? (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 24 }}>
            No commission transactions recorded yet. Use the form above to record your first commission entry.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Mill Name</th>
                  <th>Total Accrued</th>
                  <th>Total Collected</th>
                  <th>Pending Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {millLedgers.map(ml => (
                  <tr key={ml.millName}>
                    <td style={{ fontWeight: 650, color: 'var(--ink)' }}>{ml.millName}</td>
                    <td style={{ fontWeight: 650, color: 'var(--gold)' }}>{rupees(ml.accrued)}</td>
                    <td style={{ fontWeight: 650, color: 'var(--green-light)' }}>{rupees(ml.received)}</td>
                    <td style={{ fontWeight: 800, color: ml.pending > 0 ? '#fca5a5' : 'var(--green-light)' }}>
                      {rupees(ml.pending)}
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: ml.pending > 0 ? 'rgba(251, 191, 36, 0.15)' : 'rgba(0, 201, 120, 0.15)',
                          color: ml.pending > 0 ? 'var(--gold)' : 'var(--green-light)',
                        }}
                      >
                        {ml.pending > 0 ? '⏳ Due' : '✓ Settled'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction History Log */}
      <div className="panel" style={{ padding: 24, borderRadius: 18, border: '1px solid var(--border)' }}>
        <h2 style={{ margin: '0 0 16px' }}>Detailed Commission Ledger Log</h2>

        {entries.length === 0 ? (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 24 }}>
            No records found.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Mill Name</th>
                  <th>Description / Notes</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(ent => (
                  <tr key={ent.id}>
                    <td>{ent.date}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: ent.type === 'accrual' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(0, 201, 120, 0.15)',
                          color: ent.type === 'accrual' ? 'var(--gold)' : 'var(--green-light)',
                        }}
                      >
                        {ent.type === 'accrual' ? '📈 Accrual' : '💸 Receipt'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 650 }}>{ent.millName}</td>
                    <td>{ent.notes || '-'}</td>
                    <td
                      style={{
                        fontWeight: 750,
                        color: ent.type === 'accrual' ? 'var(--gold)' : 'var(--green-light)',
                      }}
                    >
                      {rupees(ent.amount)}
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
