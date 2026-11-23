import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getMillLoans,
  createMillLoan,
  repayMillLoan,
  getMillerCommissiondars,
  describeError,
} from '../api';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from '../components/SearchableSelect';

const rupees = n => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function MillerLoans() {
  const { token } = useAuth();

  const [loans, setLoans] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create Loan Form State
  const [contactId, setContactId] = useState('');
  const [principal, setPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('0');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Repayment Modal State
  const [repayingLoan, setRepayingLoan] = useState(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repaying, setRepaying] = useState(false);
  const [repayError, setRepayError] = useState('');

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');

    try {
      const [loansRes, contactsRes] = await Promise.allSettled([
        getMillLoans(token),
        getMillerCommissiondars(token),
      ]);

      if (loansRes.status === 'fulfilled') {
        const list = Array.isArray(loansRes.value)
          ? loansRes.value
          : loansRes.value?.loans || [];
        setLoans(list);
      }

      if (contactsRes.status === 'fulfilled') {
        const list = Array.isArray(contactsRes.value)
          ? contactsRes.value
          : contactsRes.value?.contacts || [];
        setContacts(list);
      }
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Map contacts for SearchableSelect
  const contactOptions = useMemo(() => {
    return contacts.map(c => ({
      id: c.id,
      name: c.name,
      subtitle: c.village ? `Village: ${c.village} • Phone: ${c.phone || '-'}` : (c.phone || 'Broker'),
      badge: 'Broker Contact',
    }));
  }, [contacts]);

  // Lookup map for fast name display
  const contactMap = useMemo(() => {
    const map = {};
    contacts.forEach(c => {
      map[c.id] = c.name;
    });
    return map;
  }, [contacts]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let totalPrincipal = 0;
    let totalOutstanding = 0;
    let activeCount = 0;

    loans.forEach(loan => {
      const p = Number(loan.principal || 0);
      const balance = Number(loan.balance ?? loan.outstanding ?? loan.principal ?? 0);
      totalPrincipal += p;
      totalOutstanding += balance;
      if (balance > 0) activeCount += 1;
    });

    return {
      totalPrincipal,
      totalOutstanding,
      activeCount,
      totalLoans: loans.length,
    };
  }, [loans]);

  const handleCreateLoan = async e => {
    e.preventDefault();
    setFormError('');
    setSuccess('');

    if (!contactId) {
      setFormError('Please select a commissiondar / broker contact.');
      return;
    }

    const p = Number(principal);
    if (!Number.isFinite(p) || p <= 0) {
      setFormError('Please enter a valid loan amount.');
      return;
    }

    setSaving(true);

    try {
      await createMillLoan(
        {
          commissiondar_id: Number(contactId),
          principal: p,
          interest_rate_pa: Number(interestRate || 0),
        },
        token
      );

      setSuccess(`✓ Loan of ${rupees(p)} successfully recorded.`);
      setContactId('');
      setPrincipal('');
      setInterestRate('0');
      await loadData();
    } catch (err) {
      setFormError(describeError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRepay = async e => {
    e.preventDefault();
    if (!repayingLoan) return;

    const amt = Number(repayAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setRepayError('Please enter a valid repayment amount.');
      return;
    }

    setRepaying(true);
    setRepayError('');

    try {
      await repayMillLoan(
        {
          loan_id: Number(repayingLoan.id),
          amount: amt,
        },
        token
      );

      setSuccess(`✓ Repayment of ${rupees(amt)} recorded successfully.`);
      setRepayingLoan(null);
      setRepayAmount('');
      await loadData();
    } catch (err) {
      setRepayError(describeError(err));
    } finally {
      setRepaying(false);
    }
  };

  return (
    <div className="miller-loans-page">
      <div style={{ marginBottom: 24 }}>
        <p className="dashboard-eyebrow">MILLER / CREDIT & FINANCE</p>
        <h1 style={{ margin: '4px 0 8px' }}>Miller Loans & Repayments</h1>
        <p style={{ color: 'var(--muted)', margin: 0 }}>
          Issue credit to commissiondar broker contacts, track annual interest, and record repayments.
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
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 6px', fontWeight: 600 }}>Active Loans</p>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.9rem', color: 'var(--ink)' }}>{metrics.activeCount}</h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>Of {metrics.totalLoans} total recorded loans</p>
        </div>

        <div className="panel" style={{ padding: 22, borderRadius: 16, border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 6px', fontWeight: 600 }}>Total Lent Out</p>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.9rem', color: 'var(--gold)' }}>{rupees(metrics.totalPrincipal)}</h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>Total principal disbursed</p>
        </div>

        <div className="panel" style={{ padding: 22, borderRadius: 16, border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 6px', fontWeight: 600 }}>Outstanding Balance</p>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.9rem', color: metrics.totalOutstanding > 0 ? '#fca5a5' : 'var(--green-light)' }}>
            {rupees(metrics.totalOutstanding)}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>Remaining principal to collect</p>
        </div>
      </div>

      {/* Issue New Loan Card */}
      <div className="panel" style={{ padding: 24, borderRadius: 18, border: '1px solid var(--border)', marginBottom: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 24 }}>💸</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Issue Loan to Commissiondar Contact</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
              Select a contact by name and enter loan terms.
            </p>
          </div>
        </div>

        {formError && (
          <p style={{ color: '#fca5a5', fontSize: 13, marginBottom: 12 }}>
            {formError}
          </p>
        )}

        <form onSubmit={handleCreateLoan}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 16,
              alignItems: 'end',
              marginBottom: 16,
            }}
          >
            <div>
              <SearchableSelect
                id="loanContact"
                label="Commissiondar Contact Name *"
                placeholder="Search contact by name..."
                options={contactOptions}
                value={contactId}
                onChange={id => setContactId(id)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                Principal Amount (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 50000"
                value={principal}
                onChange={e => setPrincipal(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                Interest Rate (% p.a.)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="0"
                value={interestRate}
                onChange={e => setInterestRate(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ minHeight: 46 }}
            >
              {saving ? 'Recording...' : 'Issue Loan'}
            </button>
          </div>
        </form>
      </div>

      {/* Loans Table */}
      <div className="panel" style={{ padding: 24, borderRadius: 18, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0 }}>Active and Settled Loans</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>
              Track loan balances and record repayments as funds are received.
            </p>
          </div>

          <button type="button" className="btn btn-ghost" onClick={loadData} disabled={loading}>
            {loading ? 'Refreshing...' : '↻ Refresh'}
          </button>
        </div>

        {loading ? (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 24 }}>Loading loans...</p>
        ) : loans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 36 }}>
            <p style={{ fontSize: 32, margin: 0 }}>📋</p>
            <h3 style={{ margin: '12px 0 6px' }}>No loans recorded</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
              Issue a loan to a commissiondar contact above to start tracking balances.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Contact Name</th>
                  <th>Principal</th>
                  <th>Interest Rate</th>
                  <th>Outstanding Balance</th>
                  <th>Date Issued</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loans.map(loan => {
                  const name = contactMap[loan.commissiondar_id] || `Contact #${loan.commissiondar_id}`;
                  const balance = Number(loan.balance ?? loan.outstanding ?? loan.principal ?? 0);
                  const isSettled = balance <= 0;

                  return (
                    <tr key={loan.id}>
                      <td style={{ fontWeight: 650, color: 'var(--ink)' }}>{name}</td>
                      <td>{rupees(loan.principal)}</td>
                      <td>{loan.interest_rate_pa ? `${loan.interest_rate_pa}% p.a.` : '0%'}</td>
                      <td style={{ fontWeight: 750, color: isSettled ? 'var(--green-light)' : 'var(--gold)' }}>
                        {rupees(balance)}
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
              Recipient: <strong style={{ color: 'var(--ink)' }}>{contactMap[repayingLoan.commissiondar_id] || 'Contact'}</strong>
              <br />
              Remaining Balance: <strong style={{ color: 'var(--gold)' }}>{rupees(repayingLoan.balance ?? repayingLoan.principal)}</strong>
            </p>

            <form onSubmit={handleRepay}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6 }}>
                  Repayment Amount (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="e.g. 10000"
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
                  disabled={repaying}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={repaying}
                >
                  {repaying ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
