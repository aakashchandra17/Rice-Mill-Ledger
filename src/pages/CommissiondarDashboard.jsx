
import { useEffect, useState } from 'react';
import { getCommissiondarDashboard, describeError } from '../api';
import { useAuth } from '../context/AuthContext';

export default function CommissiondarDashboard() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError('');
        const result = await getCommissiondarDashboard(token);
        if (active) setData(result);
      } catch (err) {
        if (active) setError(describeError(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    if (token) loadDashboard();

    return () => {
      active = false;
    };
  }, [token]);

  const metrics = [
    { label: 'Active Loans', value: data?.active_loans ?? 0 },
    {
      label: 'Total Lent Out',
      value: `₹${Number(data?.total_lent_out ?? 0).toLocaleString('en-IN')}`,
    },
    {
      label: 'Total Outstanding',
      value: `₹${Number(data?.total_outstanding ?? 0).toLocaleString('en-IN')}`,
    },
    {
      label: 'Pending Commissions',
      value: `₹${Number(data?.commissions_pending ?? 0).toLocaleString('en-IN')}`,
    },
  ];

  return (
    <div className="panel">
      <h1>Commissiondhar Dashboard</h1>
      <p>Overview of your loans, outstanding balances and commissions.</p>

      {loading && <p>Loading dashboard...</p>}
      {error && <p role="alert">{error}</p>}

      {!loading && !error && data && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: 16,
            marginTop: 20,
          }}
        >
          {metrics.map(metric => (
            <div
              key={metric.label}
              style={{
                border: '1px solid #dbe3ee',
                borderRadius: 12,
                padding: 18,
              }}
            >
              <p style={{ margin: '0 0 10px', opacity: 0.75 }}>
                {metric.label}
              </p>
              <h2 style={{ margin: 0 }}>{metric.value}</h2>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
