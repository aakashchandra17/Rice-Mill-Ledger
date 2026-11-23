import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  getCommissiondarLoans,
  createCommissiondarLoan,
  repayCommissiondarLoan,
  getCommissiondarFarmers,
  describeError,
} from '../api';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from '../components/SearchableSelect';

const money = value =>
  '₹' + Number(value || 0).toLocaleString('en-IN');

export default function CommissiondarLoans() {
  const { token } = useAuth();

  const [loans, setLoans] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Create Loan State
  const [farmerId, setFarmerId] = useState('');
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');

  // Repayment Modal State
  const [repayingLoan, setRepayingLoan] = useState(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayBusy, setRepayBusy] = useState(false);
  const [repayError, setRepayError] = useState('');

  const loadLoans = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError('Please log in again.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const [loansResult, farmersResult] = await Promise.allSettled([
        getCommissiondarLoans(token),
        getCommissiondarFarmers(token),
      ]);

      if (loansResult.status === 'fulfilled') {
        const result = loansResult.value;
        setLoans(Array.isArray(result) ? result : result?.loans ?? []);
      }

      if (farmersResult.status === 'fulfilled') {
        const fData = farmersResult.value;
        setFarmers(Array.isArray(fData) ? fData : fData?.farmers ?? []);
      }
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  const farmerMap = useMemo(() => {
    const map = {};
    farmers.forEach(f => {
      map[f.id] = f.name;
    });
    return map;
  }, [farmers]);

  const farmerOptions = useMemo(() => {
    return farmers.map(f => ({
      id: f.id,
      name: f.name,
      subtitle: f.village ? `Village: ${f.village}` : 'Farmer',
      badge: f.phone || undefined,
    }));
  }, [farmers]);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  async function handleCreate(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    const id = Number(farmerId);
    const amount = Number(principal);
    const interest = Number(rate || 0);

    if (!Number.isInteger(id) || id <= 0) {
      setError('Please select a farmer by name.');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Please enter a valid principal amount.');
      return;
    }

    setBusy(true);

    try {
      await createCommissiondarLoan(
        {
          farmer_id: id,
          principal: amount,
          interest_rate_pa: interest,
        },
        token
      );

      setMessage(`✓ Loan of ${money(amount)} issued successfully to ${farmerMap[id] || 'farmer'}.`);
      setFarmerId('');
      setPrincipal('');
      setRate('');
      await loadLoans();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleRepayment(event) {
    event.preventDefault();
    if (!repayingLoan) return;

    const amt = Number(repayAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setRepayError('Please enter a valid repayment amount.');
      return;
    }

    setRepayBusy(true);
    setRepayError('');

    try {
      await repayCommissiondarLoan(
        {
          loan_id: Number(repayingLoan.id),
          amount: amt,
        },
        token
      );

      setMessage(`✓ Repayment of ${money(amt)} recorded successfully.`);
      setRepayingLoan(null);
      setRepayAmount('');
      await loadLoans();
    } catch (err) {
      setRepayError(describeError(err));
    } finally {
      setRepayBusy(false);
    }
  }

  const summaries = useMemo(() => {
    let totalLent = 0;
    let totalBal = 0;
    let activeCount = 0;

    loans.forEach(loan => {
      const p = Number(loan.principal || 0);
      const b = Number(loan.balance ?? loan.outstanding ?? loan.principal ?? 0);
      totalLent += p;
      totalBal += b;
      if (b > 0) activeCount += 1;
    });

    return [
      {
        label: 'Active Loans',
        value: activeCount,
        color: 'var(--ink)',
      },
      {
        label: 'Total Lent Out',
        value: money(totalLent),
        color: 'var(--gold)',
      },
      {
        label: 'Outstanding Balance',
        value: money(totalBal),
        color: totalBal > 0 ? '#fca5a5' : 'var(--green-light)',
      },
      {
        label: 'Total Recorded Loans',
        value: loans.length,
        color: 'var(--cyan)',
      },
    ];
  }, [loans]);

  return (
    <div className="commissiondar-loans-page">
      <div style={{ marginBottom: 24 }}>
        <p className="dashboard-eyebrow">COMMISSIONDAR / FARMER CREDIT</p>
        <h1 style={{ margin: '4px 0 8px' }}>Farmer Loans & Repayments</h1>
        <p style={{ color: 'var(--muted)', margin: 0 }}>
          Provide credit advances to your farmers and track repayments.
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

      {/* KPI Cards */}
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
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 6px', fontWeight: 600 }}>{item.label}</p>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.9rem', color: item.color }}>{item.value}</h2>
          </div>
        ))}
      </div>

      {/* Create a Loan Form */}
      <div className="panel" style={{ padding: 24, borderRadius: 18, border: '1px solid var(--border)', marginBottom: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 24 }}>💸</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Issue Advance Loan to Farmer</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
              Select a farmer by name and specify principal amount.
            </p>
          </div>
        </div>

        <form onSubmit={handleCreate}>
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
                id="loanFarmerSelect"
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
              <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                Principal Advance (₹) *
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={principal}
                onChange={e => setPrincipal(e.target.value)}
                disabled={busy}
                placeholder="e.g. 25000"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                Annual Interest Rate (% p.a.)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={rate}
                onChange={e => setRate(e.target.value)}
                disabled={busy}
                placeholder="0"
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={busy} style={{ minHeight: 46 }}>
              {busy ? 'Recording...' : 'Issue Advance Loan'}
            </button>
          </div>
        </form>
      </div>

      {/* Loans Directory Table */}
      <div className="panel" style={{ padding: 24, borderRadius: 18, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0 }}>Active & Settled Farmer Loans</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>
              Track outstanding farmer balances and record repayments with one click.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={loadLoans}
            disabled={loading || busy}
          >
            {loading ? 'Refreshing...' : '↻ Refresh'}
          </button>
        </div>

        {loading ? (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 24 }}>Loading loans...</p>
        ) : loans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 36 }}>
            <p style={{ fontSize: 32, margin: 0 }}>📋</p>
            <h3 style={{ margin: '12px 0 6px' }}>No farmer loans recorded</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
              Issue a loan advance above to track farmer debt and repayments.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Farmer Name</th>
                  <th>Principal Lent</th>
                  <th>Interest Rate</th>
                  <th>Remaining Balance</th>
                  <th>Date Issued</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loans.map(loan => {
                  const fName = farmerMap[loan.farmer_id] || `Farmer #${loan.farmer_id}`;
                  const balance = Number(loan.balance ?? loan.outstanding ?? loan.principal ?? 0);
                  const isSettled = balance <= 0;

                  return (
                    <tr key={loan.id}>
                      <td style={{ fontWeight: 650, color: 'var(--ink)' }}>{fName}</td>
                      <td>{money(loan.principal)}</td>
                      <td>{loan.interest_rate_pa ? `${loan.interest_rate_pa}% p.a.` : '0%'}</td>
                      <td style={{ fontWeight: 750, color: isSettled ? 'var(--green-light)' : 'var(--gold)' }}>
                        {money(balance)}
                      </td>
                      <td>
                        {loan.created_at ? new Date(loan.created_at).toLocaleDateString('en-IN') : 'Recent'}
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: isSettled ? 'rgba(0, 201, 120, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                            color: isSettled ? 'var(--green-light)' : 'var(--gold)',
                          }}
                        >
                          {isSettled ? '✓ Settled' : 'Active'}
                        </span>
                      </td>
                      <td>
                        {!isSettled && (
                          <button
                            type="button"
                            className="btn btn-primary btn-small"
                            onClick={() => {
                              setRepayingLoan(loan);
                              setRepayAmount('');
                              setRepayError('');
                            }}
                          >
                            Record Repayment
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Repayment Modal */}
      {repayingLoan && (
        <div className="admin-confirm-overlay" role="dialog" aria-modal="true">
          <div className="admin-confirm-modal" style={{ maxWidth: 440 }}>
            <h3>Record Loan Repayment</h3>
            <p>
              Farmer: <strong style={{ color: 'var(--ink)' }}>{farmerMap[repayingLoan.farmer_id] || 'Farmer'}</strong>
              <br />
              Outstanding Balance: <strong style={{ color: 'var(--gold)' }}>{money(repayingLoan.balance ?? repayingLoan.principal)}</strong>
            </p>

            <form onSubmit={handleRepayment}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6 }}>
                  Repayment Amount (₹) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  placeholder="e.g. 5000"
                  value={repayAmount}
                  onChange={e => setRepayAmount(e.target.value)}
                  required
                />
              </div>

              {repayError && (
                <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: 14 }}>
                  {repayError}
                </div>
              )}

              <div className="admin-confirm-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setRepayingLoan(null)}
                  disabled={repayBusy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={repayBusy}
                >
                  {repayBusy ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
