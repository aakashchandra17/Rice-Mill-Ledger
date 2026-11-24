import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getCommissiondarMills,
  getCommissiondarMillCommissions,
  createCommissiondarMillCommission,
  getCommissiondarCommissionReceipts,
  createCommissiondarCommissionReceipt,
  describeError,
} from '../api';
import SearchableSelect from '../components/SearchableSelect';

const rupees = n => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function CommissiondarLedger() {
  const { token } = useAuth();

  const [mills, setMills] = useState([]);
  const [millsLoading, setMillsLoading] = useState(true);

  // Map of millId -> array of commissions: [{ id, commission_amount, earned_at, note, receipts: [...] }]
  const [millCommissionsMap, setMillCommissionsMap] = useState({});
  const [loadingCommissions, setLoadingCommissions] = useState(false);

  // Form states: 'accrual' | 'receipt'
  const [formType, setFormType] = useState('accrual');
  const [selectedMillId, setSelectedMillId] = useState('');
  const [selectedCommissionId, setSelectedCommissionId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  // Status feedback
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Load mills
  const loadMills = useCallback(async () => {
    if (!token) return;
    setMillsLoading(true);
    try {
      const res = await getCommissiondarMills(token, false);
      const list = Array.isArray(res) ? res : res?.mills || res?.items || [];
      setMills(list);
      return list;
    } catch (err) {
      setError(`Failed to load mills: ${describeError(err)}`);
      return [];
    } finally {
      setMillsLoading(false);
    }
  }, [token]);

  // Load commissions & receipts for all mills
  const loadAllCommissions = useCallback(
    async currentMills => {
      if (!token || !currentMills || currentMills.length === 0) return;
      setLoadingCommissions(true);

      const newMap = {};
      await Promise.allSettled(
        currentMills.map(async mill => {
          try {
            const commRes = await getCommissiondarMillCommissions(mill.id, token);
            const commList = Array.isArray(commRes)
              ? commRes
              : commRes?.commissions || commRes?.items || [];

            // For each commission, fetch its receipts
            const commissionsWithReceipts = await Promise.all(
              commList.map(async comm => {
                try {
                  const rRes = await getCommissiondarCommissionReceipts(comm.id, token);
                  const rList = Array.isArray(rRes)
                    ? rRes
                    : rRes?.receipts || rRes?.items || [];
                  return { ...comm, receipts: rList };
                } catch {
                  return { ...comm, receipts: [] };
                }
              })
            );

            newMap[mill.id] = commissionsWithReceipts;
          } catch {
            newMap[mill.id] = [];
          }
        })
      );

      setMillCommissionsMap(newMap);
      setLoadingCommissions(false);
    },
    [token]
  );

  const refreshLedger = useCallback(async () => {
    const loadedMills = await loadMills();
    if (loadedMills && loadedMills.length > 0) {
      await loadAllCommissions(loadedMills);
    }
  }, [loadMills, loadAllCommissions]);

  useEffect(() => {
    refreshLedger();
  }, [refreshLedger]);

  // Options for Mill dropdown
  const millOptions = useMemo(() => {
    return mills
      .filter(m => m.is_active !== false)
      .map(m => ({
        id: String(m.id),
        name: m.name,
        subtitle: `Mill #${m.id}`,
        badge: 'Partner Mill',
      }));
  }, [mills]);

  // Available commissions for receipt recording under selected mill
  const availableCommissionsForMill = useMemo(() => {
    if (!selectedMillId) return [];
    const list = millCommissionsMap[selectedMillId] || [];
    return list.map(c => {
      const earned = Number(c.commission_amount || c.amount || 0);
      const received = (c.receipts || []).reduce(
        (sum, r) => sum + Number(r.amount || 0),
        0
      );
      const pending = Math.max(0, earned - received);
      return {
        id: String(c.id),
        name: `Commission #${c.id} - ${rupees(earned)} (${c.earned_at || 'Date N/A'})`,
        subtitle: `Pending: ${rupees(pending)} | Received: ${rupees(received)}`,
        badge: pending <= 0 ? 'Settled' : 'Pending',
        pending,
      };
    });
  }, [selectedMillId, millCommissionsMap]);

  // Global totals computation
  const totals = useMemo(() => {
    let earned = 0;
    let received = 0;

    Object.values(millCommissionsMap).forEach(commList => {
      commList.forEach(c => {
        const amt = Number(c.commission_amount || c.amount || 0);
        earned += amt;
        (c.receipts || []).forEach(r => {
          received += Number(r.amount || 0);
        });
      });
    });

    return {
      earned,
      received,
      pending: Math.max(0, earned - received),
    };
  }, [millCommissionsMap]);

  // Per-mill ledger breakdown
  const millSummaries = useMemo(() => {
    return mills.map(mill => {
      const commList = millCommissionsMap[mill.id] || [];
      let millEarned = 0;
      let millReceived = 0;

      commList.forEach(c => {
        millEarned += Number(c.commission_amount || c.amount || 0);
        (c.receipts || []).forEach(r => {
          millReceived += Number(r.amount || 0);
        });
      });

      return {
        millId: mill.id,
        millName: mill.name,
        isActive: mill.is_active !== false,
        earned: millEarned,
        received: millReceived,
        pending: Math.max(0, millEarned - millReceived),
        commissions: commList,
      };
    });
  }, [mills, millCommissionsMap]);

  // Form submission handler
  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedMillId) {
      setError('Please select a partner rice mill.');
      return;
    }

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    setBusy(true);

    try {
      if (formType === 'accrual') {
        // Record commission earned from mill
        const payload = {
          commission_amount: amt,
          earned_at: date || new Date().toISOString().slice(0, 10),
          note: notes.trim() || undefined,
        };

        await createCommissiondarMillCommission(selectedMillId, payload, token);
        setSuccess(`✓ Commission of ${rupees(amt)} recorded against mill.`);
      } else {
        // Record receipt against a commission
        let targetCommissionId = selectedCommissionId;

        // If user didn't pick a specific commission, auto-pick the first commission with pending balance
        if (!targetCommissionId) {
          const commList = millCommissionsMap[selectedMillId] || [];
          const candidate = commList.find(c => {
            const e = Number(c.commission_amount || c.amount || 0);
            const r = (c.receipts || []).reduce((s, x) => s + Number(x.amount || 0), 0);
            return e - r > 0;
          }) || commList[0];

          if (candidate) {
            targetCommissionId = candidate.id;
          } else {
            throw new Error(
              'No commission record found for this mill. Please record a commission earned first before logging a receipt.'
            );
          }
        }

        const payload = {
          amount: amt,
          received_at: date || new Date().toISOString().slice(0, 10),
          note: notes.trim() || undefined,
        };

        await createCommissiondarCommissionReceipt(targetCommissionId, payload, token);
        setSuccess(`✓ Payment receipt of ${rupees(amt)} recorded successfully.`);
      }

      setAmount('');
      setNotes('');
      setSelectedCommissionId('');
      await refreshLedger();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="commissiondar-ledger-page" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <p className="dashboard-eyebrow">COMMISSIONDAR / FINANCIAL RECONCILIATION</p>
        <h1 style={{ margin: '4px 0 8px' }}>Manual Mill Commission Ledger</h1>
        <p style={{ color: 'var(--muted)', margin: 0 }}>
          Record commission earned from rice mills, record payment receipts, and reconcile pending dues via authenticated backend records.
        </p>
      </div>

      {success && (
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
          {success}
        </div>
      )}

      {error && (
        <div
          className="panel form-error"
          role="alert"
          style={{ padding: 14, marginBottom: 16 }}
        >
          {error}
        </div>
      )}

      {/* Top 3 Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div className="panel" style={{ padding: 22, borderRadius: 16 }}>
          <div style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 4 }}>
            TOTAL COMMISSION EARNED
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--gold)' }}>
            {rupees(totals.earned)}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
            Total accrued across all mills
          </div>
        </div>

        <div className="panel" style={{ padding: 22, borderRadius: 16 }}>
          <div style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 4 }}>
            TOTAL COMMISSION RECEIVED
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--green-light)' }}>
            {rupees(totals.received)}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
            Payments collected from mills
          </div>
        </div>

        <div className="panel" style={{ padding: 22, borderRadius: 16 }}>
          <div style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 4 }}>
            NET PENDING COMMISSION
          </div>
          <div
            style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              color: totals.pending > 0 ? '#ef4444' : 'var(--green-light)',
            }}
          >
            {rupees(totals.pending)}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
            Outstanding balance due from mills
          </div>
        </div>
      </div>

      {/* Recording Form Panel */}
      <div
        className="panel"
        style={{
          padding: 24,
          borderRadius: 18,
          border: '1px solid var(--border)',
          marginBottom: 26,
        }}
      >
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button
            type="button"
            className={`btn ${formType === 'accrual' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => {
              setFormType('accrual');
              setError('');
              setSuccess('');
            }}
          >
            📈 Record Commission Earned
          </button>

          <button
            type="button"
            className={`btn ${formType === 'receipt' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => {
              setFormType('receipt');
              setError('');
              setSuccess('');
            }}
          >
            💰 Record Payment Receipt
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
              marginBottom: 16,
            }}
          >
            {/* Select Mill */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                Partner Rice Mill *
              </label>
              <SearchableSelect
                options={millOptions}
                value={selectedMillId}
                onChange={val => {
                  setSelectedMillId(val);
                  setSelectedCommissionId('');
                }}
                placeholder="Search mill name..."
              />
            </div>

            {/* If Receipt: select specific commission (optional) */}
            {formType === 'receipt' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                  Apply to Commission Record (Optional)
                </label>
                <SearchableSelect
                  options={availableCommissionsForMill}
                  value={selectedCommissionId}
                  onChange={setSelectedCommissionId}
                  placeholder={
                    selectedMillId
                      ? 'Select commission record or leave blank for auto-match'
                      : 'First select a mill above'
                  }
                />
              </div>
            )}

            {/* Amount */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                {formType === 'accrual' ? 'Commission Amount (₹) *' : 'Receipt Amount (₹) *'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 5000"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                disabled={busy}
              />
            </div>

            {/* Date */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                Date (YYYY-MM-DD)
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                disabled={busy}
              />
            </div>

            {/* Notes */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: 6 }}>
                Notes / Reference (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Dispatched 500 bags Sona Masoori, Cheque #1024"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={busy}
              />
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={busy || !selectedMillId || !amount}
              style={{ minHeight: 44, padding: '0 26px' }}
            >
              {busy
                ? 'Submitting...'
                : formType === 'accrual'
                  ? 'Save Commission Earned'
                  : 'Save Payment Receipt'}
            </button>
          </div>
        </form>
      </div>

      {/* Mill-wise Reconciliation Table */}
      <div className="panel" style={{ padding: 24, borderRadius: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Mill Commission Ledger & History</h2>
            <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.85rem' }}>
              Historical commission accruals and receipts fetched from backend database.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={refreshLedger}
            disabled={millsLoading || loadingCommissions}
          >
            {loadingCommissions ? 'Refreshing...' : '↻ Refresh Ledger'}
          </button>
        </div>

        {millsLoading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
            Loading ledger...
          </div>
        ) : millSummaries.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
            No mills added yet. Go to My Mills to add partner mills.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.82rem' }}>
                  <th style={{ padding: '12px 14px' }}>MILL NAME</th>
                  <th style={{ padding: '12px 14px' }}>RECORDS</th>
                  <th style={{ padding: '12px 14px' }}>EARNED</th>
                  <th style={{ padding: '12px 14px' }}>RECEIVED</th>
                  <th style={{ padding: '12px 14px' }}>PENDING BALANCE</th>
                  <th style={{ padding: '12px 14px' }}>COMMISSION HISTORY</th>
                </tr>
              </thead>
              <tbody>
                {millSummaries.map(m => (
                  <tr key={m.millId} style={{ borderBottom: '1px solid var(--border)', verticalAlign: 'top' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 650 }}>
                      {m.millName}
                      {!m.isActive && (
                        <span style={{ fontSize: '0.72rem', color: '#ef4444', marginLeft: 6 }}>
                          (Deactivated)
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: '0.85rem' }}>
                      {m.commissions.length} entries
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--gold)', fontWeight: 600 }}>
                      {rupees(m.earned)}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--green-light)', fontWeight: 600 }}>
                      {rupees(m.received)}
                    </td>
                    <td
                      style={{
                        padding: '12px 14px',
                        fontWeight: 700,
                        color: m.pending > 0 ? '#ef4444' : 'var(--green-light)',
                      }}
                    >
                      {rupees(m.pending)}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '0.82rem' }}>
                      {m.commissions.length === 0 ? (
                        <span style={{ color: 'var(--muted)' }}>—</span>
                      ) : (
                        <div style={{ display: 'grid', gap: 6 }}>
                          {m.commissions.slice(0, 3).map(c => {
                            const cEarned = Number(c.commission_amount || c.amount || 0);
                            const cReceived = (c.receipts || []).reduce(
                              (s, r) => s + Number(r.amount || 0),
                              0
                            );
                            const cPending = Math.max(0, cEarned - cReceived);

                            return (
                              <div
                                key={c.id}
                                style={{
                                  background: 'var(--surface-soft)',
                                  padding: '6px 10px',
                                  borderRadius: 8,
                                  fontSize: '0.78rem',
                                }}
                              >
                                <div>
                                  <strong>{rupees(cEarned)}</strong> ({c.earned_at || '—'})
                                  <span style={{ marginLeft: 8, color: cPending <= 0 ? 'var(--green-light)' : '#f59e0b' }}>
                                    {cPending <= 0 ? '✓ Paid' : `Due: ${rupees(cPending)}`}
                                  </span>
                                </div>
                                {c.note && (
                                  <div style={{ color: 'var(--muted)', fontSize: '0.74rem' }}>
                                    {c.note}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {m.commissions.length > 3 && (
                            <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
                              +{m.commissions.length - 3} older records
                            </span>
                          )}
                        </div>
                      )}
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
