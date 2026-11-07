
import { useCallback, useEffect, useState } from 'react';
import {
  getCommissiondarLoans,
  createCommissiondarLoan,
  repayCommissiondarLoan,
  describeError,
} from '../api';
import { useAuth } from '../context/AuthContext';

const money = value =>
  '₹' + Number(value || 0).toLocaleString('en-IN');

export default function CommissiondarLoans() {
  const { token } = useAuth();

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [farmerId, setFarmerId] = useState('');
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [repayLoanId, setRepayLoanId] = useState('');
  const [repayAmount, setRepayAmount] = useState('');

  const loadLoans = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError('Please log in again.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const result = await getCommissiondarLoans(token);
      setLoans(Array.isArray(result) ? result : result?.loans ?? []);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  async function handleCreate(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    const id = Number(farmerId);
    const amount = Number(principal);
    const interest = Number(rate);

    if (!Number.isInteger(id) || id <= 0) {
      setError('Enter a valid Farmer ID.');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid principal amount.');
      return;
    }

    if (!Number.isFinite(interest) || interest < 0) {
      setError('Enter a valid annual interest rate.');
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

      setMessage('Loan created successfully.');
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
    setError('');
    setMessage('');

    const id = Number(repayLoanId);
    const amount = Number(repayAmount);

    if (!Number.isInteger(id) || id <= 0) {
      setError('Enter a valid Loan ID.');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid repayment amount.');
      return;
    }

    setBusy(true);

    try {
      await repayCommissiondarLoan(
        {
          loan_id: id,
          amount,
        },
        token
      );

      setMessage('Repayment recorded successfully.');
      setRepayLoanId('');
      setRepayAmount('');
      await loadLoans();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  const totalPrincipal = loans.reduce(
    (sum, loan) => sum + Number(loan.principal || 0), 0
  );

  const totalRepaid = loans.reduce(
    (sum, loan) => sum + Number(loan.total_repaid || 0), 0
  );

  const totalOutstanding = loans.reduce(
    (sum, loan) => sum + Number(loan.outstanding || 0), 0
  );

  const summaries = [
    { label: 'Total Loans', value: loans.length },
    { label: 'Total Lent Out', value: money(totalPrincipal) },
    { label: 'Total Repaid', value: money(totalRepaid) },
    { label: 'Outstanding', value: money(totalOutstanding) },
  ];

  const inputStyle = {
    width: '100%',
    padding: '11px 12px',
    marginTop: 7,
    borderRadius: 8,
    border: '1px solid var(--border, #ccc)',
    boxSizing: 'border-box',
  };

  const cardStyle = {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  };

  return (
    <div className="commissiondar-loans-page">
      <div style={{ marginBottom: 22 }}>
        <h1>Farmer Loans</h1>
        <p style={{ color: 'var(--muted)' }}>
          Create loans, check outstanding balances and record repayments.
        </p>
      </div>

      {error && (
        <div className="panel form-error" role="alert" style={{ padding: 14 }}>
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
            color: 'var(--green)',
          }}
        >
          {message}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 14,
          marginBottom: 24,
        }}
      >
        {summaries.map(item => (
          <div className="panel" key={item.label} style={{ padding: 18 }}>
            <p style={{ color: 'var(--muted)', marginTop: 0 }}>
              {item.label}
            </p>
            <h2 style={{ marginBottom: 0 }}>{item.value}</h2>
          </div>
        ))}
      </div>

      <div className="panel" style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Create a Loan</h2>

        <form
          onSubmit={handleCreate}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: 16,
            alignItems: 'end',
          }}
        >
          <label>
            <b>Farmer ID</b>
            <input
              style={inputStyle}
              type="number"
              min="1"
              required
              value={farmerId}
              onChange={e => setFarmerId(e.target.value)}
              disabled={busy}
              placeholder="Enter farmer ID"
            />
          </label>

          <label>
            <b>Principal Amount (₹)</b>
            <input
              style={inputStyle}
              type="number"
              min="0.01"
              step="0.01"
              required
              value={principal}
              onChange={e => setPrincipal(e.target.value)}
              disabled={busy}
              placeholder="Enter amount"
            />
          </label>

          <label>
            <b>Annual Interest Rate (%)</b>
            <input
              style={inputStyle}
              type="number"
              min="0"
              step="0.01"
              required
              value={rate}
              onChange={e => setRate(e.target.value)}
              disabled={busy}
              placeholder="Enter interest rate"
            />
          </label>

          <button type="submit" disabled={busy}>
            {busy ? 'Please wait...' : 'Create Loan'}
          </button>
        </form>
      </div>

      <div className="panel" style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Record a Repayment</h2>

        <form
          onSubmit={handleRepayment}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: 16,
            alignItems: 'end',
          }}
        >
          <label>
            <b>Loan ID</b>
            <input
              style={inputStyle}
              type="number"
              min="1"
              required
              value={repayLoanId}
              onChange={e => setRepayLoanId(e.target.value)}
              disabled={busy}
              placeholder="Enter loan ID"
            />
          </label>

          <label>
            <b>Repayment Amount (₹)</b>
            <input
              style={inputStyle}
              type="number"
              min="0.01"
              step="0.01"
              required
              value={repayAmount}
              onChange={e => setRepayAmount(e.target.value)}
              disabled={busy}
              placeholder="Enter amount"
            />
          </label>

          <button type="submit" disabled={busy}>
            {busy ? 'Please wait...' : 'Record Repayment'}
          </button>
        </form>
      </div>

      <div className="panel" style={{ padding: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 16,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Your Loans</h2>
            <p style={{ color: 'var(--muted)', marginBottom: 0 }}>
              Loan records from your backend
            </p>
          </div>

          <button
            type="button"
            onClick={loadLoans}
            disabled={loading || busy}
          >
            {loading ? 'Loading...' : '↻ Refresh'}
          </button>
        </div>

        {loading ? (
          <p>Loading loans...</p>
        ) : loans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 25 }}>
            <p style={{ fontSize: 28 }}>📋</p>
            <h3>No loans found</h3>
            <p style={{ color: 'var(--muted)' }}>
              Create your first loan using the form above.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Loan ID</th>
                  <th>Farmer ID</th>
                  <th>Principal</th>
                  <th>Interest Accrued</th>
                  <th>Repaid</th>
                  <th>Outstanding</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {loans.map((loan, index) => (
                  <tr key={loan.id ?? index}>
                    <td>{loan.id ?? '—'}</td>
                    <td>{loan.farmer_id ?? '—'}</td>
                    <td>{money(loan.principal)}</td>
                    <td>{money(loan.interest_accrued)}</td>
                    <td>{money(loan.total_repaid)}</td>
                    <td>{money(loan.outstanding)}</td>
                    <td>{loan.status ?? '—'}</td>
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
