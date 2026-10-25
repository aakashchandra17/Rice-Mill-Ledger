
import { useCallback, useEffect, useState } from 'react';
import {
  getCommissiondarLoans,
  createCommissiondarLoan,
  repayCommissiondarLoan,
  describeError,
} from '../api';
import { useAuth } from '../context/AuthContext';

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
    setBusy(true);

    try {
      await createCommissiondarLoan(
        {
          farmer_id: Number(farmerId),
          principal: Number(principal),
          interest_rate_pa: Number(rate),
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
    setBusy(true);

    try {
      await repayCommissiondarLoan(
        {
          loan_id: Number(repayLoanId),
          amount: Number(repayAmount),
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

  return (
    <div className="panel">
      <h1>Farmer Loans</h1>
      <p>Create loans, check outstanding balances and record repayments.</p>

      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      <h2>Create a Loan</h2>
      <form onSubmit={handleCreate} style={formStyle}>
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
          Principal Amount (₹)
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={principal}
            onChange={e => setPrincipal(e.target.value)}
          />
        </label>
        <label>
          Annual Interest Rate (%)
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={rate}
            onChange={e => setRate(e.target.value)}
          />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? 'Please wait...' : 'Create Loan'}
        </button>
      </form>

      <h2 style={{ marginTop: 28 }}>Record a Repayment</h2>
      <form onSubmit={handleRepayment} style={formStyle}>
        <label>
          Loan ID
          <input
            type="number"
            min="1"
            required
            value={repayLoanId}
            onChange={e => setRepayLoanId(e.target.value)}
          />
        </label>
        <label>
          Repayment Amount (₹)
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={repayAmount}
            onChange={e => setRepayAmount(e.target.value)}
          />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? 'Please wait...' : 'Record Repayment'}
        </button>
      </form>

      <h2 style={{ marginTop: 28 }}>Your Loans</h2>
      {loading ? (
        <p>Loading loans...</p>
      ) : loans.length === 0 ? (
        <p>No loans found.</p>
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
  );
}

function money(value) {
  return `₹${Number(value ?? 0).toLocaleString('en-IN')}`;
}

const formStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'end',
  gap: 12,
  marginBottom: 20,
};

