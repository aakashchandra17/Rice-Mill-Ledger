
import { useCallback, useEffect, useState } from 'react';
import {
  getCommissiondarDashboard,
  describeError,
} from '../api';
import { useAuth } from '../context/AuthContext';

const rupees = value =>
  '₹' + Number(value || 0).toLocaleString('en-IN');

export default function CommissiondarDashboard() {
  const { token } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError('Please log in again to view your dashboard.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const result = await getCommissiondarDashboard(token);
      setData(result);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const metrics = [
    {
      label: 'Active Loans',
      value: Number(data?.active_loans ?? 0).toLocaleString('en-IN'),
      icon: '📋',
      description: 'Currently active loans',
    },
    {
      label: 'Total Lent Out',
      value: rupees(data?.total_lent_out),
      icon: '💰',
      description: 'Total amount given as loans',
    },
    {
      label: 'Total Outstanding',
      value: rupees(data?.total_outstanding),
      icon: '📊',
      description: 'Amount yet to be recovered',
    },
    {
      label: 'Pending Commissions',
      value: rupees(data?.commissions_pending),
      icon: '⏳',
      description: 'Commission amount pending',
    },
  ];

  return (
    <div className="commissiondar-dashboard-page">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 22,
        }}
      >
        <div>
          <h1 style={{ marginBottom: 6 }}>
            Commissiondhar Dashboard
          </h1>
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            Overview of your loans, outstanding balances and commissions.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDashboard}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      {loading && (
        <div className="panel" style={{ padding: 24 }}>
          <p style={{ margin: 0 }}>Loading dashboard...</p>
        </div>
      )}

      {error && (
        <div
          className="panel"
          role="alert"
          style={{ padding: 22 }}
        >
          <h3 style={{ marginTop: 0 }}>Unable to load dashboard</h3>
          <p>{error}</p>
          <button type="button" onClick={loadDashboard}>
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: 16,
            }}
          >
            {metrics.map((metric, index) => (
              <div
                className="panel"
                key={metric.label}
                style={{
                  padding: 20,
                  borderRadius: 14,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 18,
                  }}
                >
                  <span
                    style={{
                      color: 'var(--muted)',
                      fontSize: 14,
                      fontWeight: 500,
                    }}
                  >
                    {metric.label}
                  </span>

                  <span style={{ fontSize: 24 }}>
                    {metric.icon}
                  </span>
                </div>

                <h2
                  style={{
                    margin: '0 0 10px',
                    fontSize: 25,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {metric.value}
                </h2>

                <p
                  style={{
                    color: 'var(--muted)',
                    fontSize: 12,
                    margin: 0,
                  }}
                >
                  {metric.description}
                </p>
              </div>
            ))}
          </div>

          <div
            className="panel"
            style={{ marginTop: 20, padding: 20 }}
          >
            <h3 style={{ marginTop: 0 }}>Dashboard Overview</h3>
            <p style={{ color: 'var(--muted)', marginBottom: 0 }}>
              Your latest loan and commission figures are displayed above.
              Use the navigation menu to access your other account sections.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
