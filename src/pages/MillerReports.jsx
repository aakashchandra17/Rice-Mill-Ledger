import { useState, useEffect, useCallback, useMemo } from 'react';
import { getProfit, describeError } from '../api';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

const rupees = n => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function MillerReports() {
  const { token, user } = useAuth();
  const { farmers, transactions } = useData();

  const [profitData, setProfitData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load exports from user local storage
  const storageKey = `miller_exports_${user?.id || user?.phone || 'default'}`;
  const exportsList = useMemo(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }, [storageKey]);

  const loadProfit = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');

    try {
      const data = await getProfit(token);
      setProfitData(data);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadProfit();
  }, [loadProfit]);

  // Aggregated Reports
  const intakeTransactions = useMemo(() => {
    return transactions.filter(t => t.type === 'intake');
  }, [transactions]);

  const paymentTransactions = useMemo(() => {
    return transactions.filter(t => t.type === 'payment');
  }, [transactions]);

  const totalIntakeAmount = useMemo(() => {
    return intakeTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [intakeTransactions]);

  const totalPaymentsAmount = useMemo(() => {
    return paymentTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [paymentTransactions]);

  const totalExportRevenue = useMemo(() => {
    return exportsList.reduce((sum, e) => sum + Number(e.total || 0), 0);
  }, [exportsList]);

  const totalFarmerOwed = useMemo(() => {
    return farmers.reduce((sum, f) => sum + Number(f.owed || 0), 0);
  }, [farmers]);

  return (
    <div className="miller-reports-page">
      <div style={{ marginBottom: 24 }}>
        <p className="dashboard-eyebrow">MILLER / FINANCIAL AUDIT</p>
        <h1 style={{ margin: '4px 0 8px' }}>Profit Calculations & Mill Reports</h1>
        <p style={{ color: 'var(--muted)', margin: 0 }}>
          Real-time profit metrics directly from backend ledgers and comprehensive operational reports.
        </p>
      </div>

      {error && (
        <div className="panel form-error" role="alert" style={{ padding: 14, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Backend Profit Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 26,
        }}
      >
        <div className="panel" style={{ padding: 22, borderRadius: 16, border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 6px', fontWeight: 600 }}>Total Revenue</p>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.9rem', color: 'var(--green-light)' }}>
            {rupees(profitData?.revenue ?? profitData?.total_revenue ?? totalExportRevenue)}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>Exports & sales revenue</p>
        </div>

        <div className="panel" style={{ padding: 22, borderRadius: 16, border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 6px', fontWeight: 600 }}>Total Expenses</p>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.9rem', color: '#fca5a5' }}>
            {rupees(profitData?.expenses ?? profitData?.total_expenses ?? totalIntakeAmount)}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>Paddy procurement & costs</p>
        </div>

        <div className="panel" style={{ padding: 22, borderRadius: 16, border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 6px', fontWeight: 600 }}>Net Profit</p>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.9rem', color: 'var(--gold)' }}>
            {rupees(profitData?.profit ?? profitData?.net_profit ?? (totalExportRevenue - totalIntakeAmount))}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>Operating profit</p>
        </div>

        <div className="panel" style={{ padding: 22, borderRadius: 16, border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 6px', fontWeight: 600 }}>Outstanding Farmer Dues</p>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.9rem', color: totalFarmerOwed > 0 ? '#fca5a5' : 'var(--green-light)' }}>
            {rupees(totalFarmerOwed)}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>Current payables to farmers</p>
        </div>
      </div>

      {/* Operational Reports Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20 }}>
        {/* Report 1: Intake Summary */}
        <div className="panel" style={{ padding: 24, borderRadius: 18, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Paddy Intake Summary</h3>
            <span className="badge badge-on">{intakeTransactions.length} entries</span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 16 }}>
            Total intake recorded in this session: <strong style={{ color: 'var(--gold)' }}>{rupees(totalIntakeAmount)}</strong>
          </p>

          {intakeTransactions.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>No intake entries in this session.</p>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: 240 }}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Farmer</th>
                    <th>Quantity</th>
                    <th>Rate</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {intakeTransactions.map(t => {
                    const fName = farmers.find(f => Number(f.id) === Number(t.farmerId))?.name || 'Farmer';
                    return (
                      <tr key={t.id}>
                        <td>{t.date}</td>
                        <td style={{ fontWeight: 600 }}>{fName}</td>
                        <td>{t.quantity}</td>
                        <td>{rupees(t.rate)}</td>
                        <td style={{ fontWeight: 700, color: 'var(--gold)' }}>{rupees(t.amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Report 2: Farmer Payments Summary */}
        <div className="panel" style={{ padding: 24, borderRadius: 18, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Farmer Payments Summary</h3>
            <span className="badge badge-farmer">{paymentTransactions.length} entries</span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 16 }}>
            Total payments disbursed: <strong style={{ color: 'var(--green-light)' }}>{rupees(totalPaymentsAmount)}</strong>
          </p>

          {paymentTransactions.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>No payments recorded in this session.</p>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: 240 }}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Farmer</th>
                    <th>Mode</th>
                    <th>Amount Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentTransactions.map(t => {
                    const fName = farmers.find(f => Number(f.id) === Number(t.farmerId))?.name || 'Farmer';
                    return (
                      <tr key={t.id}>
                        <td>{t.date}</td>
                        <td style={{ fontWeight: 600 }}>{fName}</td>
                        <td>{(t.mode || 'Cash').toUpperCase()}</td>
                        <td style={{ fontWeight: 700, color: 'var(--green-light)' }}>{rupees(t.amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
