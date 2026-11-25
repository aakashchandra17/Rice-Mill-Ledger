import { useCallback, useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  getCommissiondarDashboard,
  getCommissiondarLoans,
  getCommissiondarFarmers,
  getCommissiondarMills,
  getCommissiondarMillFarmers,
  getCommissiondarMillCommissions,
  getCommissiondarCommissionReceipts,
  describeError,
} from '../api';
import { useAuth } from '../context/AuthContext';

const rupees = value =>
  '₹' + Number(value || 0).toLocaleString('en-IN');
const number = value =>
  Number(value || 0).toLocaleString('en-IN');

const formatDate = value => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function CommissiondarDashboard() {
  const { token, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Primary backend dashboard response: { active_loans, total_lent_out, total_outstanding, commissions_pending }
  const [dashboardData, setDashboardData] = useState(null);

  // Entities
  const [farmers, setFarmers] = useState([]);
  const [mills, setMills] = useState([]);
  const [associatedFarmerCount, setAssociatedFarmerCount] = useState(0);

  // Financial aggregates
  const [commissionsEarned, setCommissionsEarned] = useState(0);
  const [commissionsReceived, setCommissionsReceived] = useState(0);
  const [commissionsPending, setCommissionsPending] = useState(0);

  // Activity feeds
  const [recentCommissions, setRecentCommissions] = useState([]);
  const [recentLoans, setRecentLoans] = useState([]);

  const loadDashboard = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError('Please log in again to view your dashboard.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Fetch main dashboard summary
      let dashRes = null;
      try {
        dashRes = await getCommissiondarDashboard(token);
        setDashboardData(dashRes);
      } catch (dashErr) {
        console.warn('Backend dashboard summary call:', dashErr);
      }

      // 2. Fetch farmers, mills, and loans in parallel
      const [farmersRes, millsRes, loansRes] = await Promise.allSettled([
        getCommissiondarFarmers(token),
        getCommissiondarMills(token, true),
        getCommissiondarLoans(token),
      ]);

      const farmersList =
        farmersRes.status === 'fulfilled' && farmersRes.value
          ? Array.isArray(farmersRes.value)
            ? farmersRes.value
            : farmersRes.value?.farmers || []
          : [];
      setFarmers(farmersList);

      const millsList =
        millsRes.status === 'fulfilled' && millsRes.value
          ? Array.isArray(millsRes.value)
            ? millsRes.value
            : millsRes.value?.mills || []
          : [];
      setMills(millsList);

      const loansList =
        loansRes.status === 'fulfilled' && loansRes.value
          ? Array.isArray(loansRes.value)
            ? loansRes.value
            : loansRes.value?.loans || []
          : [];
      setRecentLoans(loansList.slice(0, 5));

      // 3. For each mill, fetch associated farmers and commissions
      const uniqueAssociatedFarmerIds = new Set();
      let totalEarned = 0;
      let totalRecv = 0;
      const commissionActivities = [];

      await Promise.allSettled(
        millsList.map(async mill => {
          try {
            // Associated farmers
            const fRes = await getCommissiondarMillFarmers(mill.id, token);
            const fList = Array.isArray(fRes) ? fRes : fRes?.farmers || [];
            fList.forEach(f => uniqueAssociatedFarmerIds.add(f.id || f.farmer_id));
          } catch {}

          try {
            // Commissions for this mill
            const cRes = await getCommissiondarMillCommissions(mill.id, token);
            const cList = Array.isArray(cRes) ? cRes : cRes?.commissions || [];

            await Promise.all(
              cList.map(async comm => {
                const earnedAmt = Number(comm.commission_amount || comm.amount || 0);
                totalEarned += earnedAmt;

                let commRecv = 0;
                try {
                  const rRes = await getCommissiondarCommissionReceipts(comm.id, token);
                  const rList = Array.isArray(rRes) ? rRes : rRes?.receipts || [];
                  rList.forEach(r => {
                    const rAmt = Number(r.amount || 0);
                    commRecv += rAmt;
                  });
                } catch {}

                totalRecv += commRecv;

                commissionActivities.push({
                  id: comm.id,
                  millName: mill.name,
                  amount: earnedAmt,
                  received: commRecv,
                  pending: Math.max(0, earnedAmt - commRecv),
                  date: comm.earned_at || comm.created_at,
                  note: comm.note,
                });
              })
            );
          } catch {}
        })
      );

      setAssociatedFarmerCount(uniqueAssociatedFarmerIds.size);
      setCommissionsEarned(totalEarned);
      setCommissionsReceived(totalRecv);
      setCommissionsPending(Math.max(0, totalEarned - totalRecv));

      // Sort recent commission activities by date/id descending
      commissionActivities.sort((a, b) => (b.id || 0) - (a.id || 0));
      setRecentCommissions(commissionActivities.slice(0, 5));
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Priority metrics display
  const metrics = [
    {
      label: 'Network Farmers',
      value: number(farmers.length),
      subtext: 'Directly registered farmers',
      icon: '👨‍🌾',
      tone: 'var(--green-light)',
      to: '/commissiondar/farmers',
    },
    {
      label: 'Partner Rice Mills',
      value: number(mills.length),
      subtext: `${associatedFarmerCount} associated farmers`,
      icon: '🏭',
      tone: 'var(--cyan)',
      to: '/commissiondar/mills',
    },
    {
      label: 'Commission Earned',
      value: rupees(commissionsEarned),
      subtext: 'Total earned from mills',
      icon: '📈',
      tone: 'var(--gold)',
      to: '/commissiondar/ledger',
    },
    {
      label: 'Commission Received',
      value: rupees(commissionsReceived),
      subtext: 'Payments collected',
      icon: '💰',
      tone: 'var(--green-light)',
      to: '/commissiondar/ledger',
    },
    {
      label: 'Pending Commission',
      value: rupees(commissionsPending || dashboardData?.commissions_pending),
      subtext: 'Due from partner mills',
      icon: '⏳',
      tone: (commissionsPending || dashboardData?.commissions_pending) > 0 ? '#ef4444' : 'var(--green-light)',
      to: '/commissiondar/ledger',
    },
    {
      label: 'Active Farmer Loans',
      value: number(dashboardData?.active_loans ?? recentLoans.length),
      subtext: `Outstanding: ${rupees(dashboardData?.total_outstanding)}`,
      icon: '📋',
      tone: '#f59e0b',
      to: '/commissiondar/loans',
    },
  ];

  return (
    <div className="commissiondar-dashboard-page" style={{ maxWidth: 1100, margin: '0 auto' }}>
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
          <p className="dashboard-eyebrow">COMMISSION AGENT SUITE / OVERVIEW</p>
          <h1 style={{ margin: '4px 0 6px' }}>Commissiondar Dashboard</h1>
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            Live status of your farmer network, mill associations, commission ledgers, and loan portfolios.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={loadDashboard}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : '↻ Refresh Dashboard'}
        </button>
      </div>

      {error && (
        <div className="panel form-error" role="alert" style={{ padding: 14, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="panel" style={{ padding: 36, textAlign: 'center' }}>
          <p style={{ margin: 0 }}>Loading commissiondar metrics...</p>
        </div>
      ) : (
        <>
          {/* Top 6 KPI Metric Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: 16,
              marginBottom: 24,
            }}
          >
            {metrics.map(metric => (
              <Link
                key={metric.label}
                to={metric.to}
                className="panel"
                style={{
                  padding: 20,
                  borderRadius: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  textDecoration: 'none',
                  color: 'var(--ink)',
                  border: '1px solid var(--border)',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = metric.tone;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 650, textTransform: 'uppercase' }}>
                      {metric.label}
                    </span>
                    <span style={{ fontSize: 22 }}>{metric.icon}</span>
                  </div>

                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: metric.tone, margin: '0 0 4px' }}>
                    {metric.value}
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 10 }}>
                  {metric.subtext}
                </div>
              </Link>
            ))}
          </div>

          {/* Quick Action Navigation Grid */}
          <div className="panel" style={{ padding: 22, borderRadius: 16, marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '1.05rem' }}>Commissiondar Quick Navigation</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <Link to="/commissiondar/farmers" className="btn btn-ghost" style={{ textAlign: 'center', padding: '12px 10px' }}>
                👨‍🌾 Farmers ({farmers.length})
              </Link>
              <Link to="/commissiondar/mills" className="btn btn-ghost" style={{ textAlign: 'center', padding: '12px 10px' }}>
                🏭 My Mills ({mills.length})
              </Link>
              <Link to="/commissiondar/grain-types" className="btn btn-ghost" style={{ textAlign: 'center', padding: '12px 10px' }}>
                🌾 Custom Grains
              </Link>
              <Link to="/commissiondar/stock" className="btn btn-ghost" style={{ textAlign: 'center', padding: '12px 10px' }}>
                📦 Stock & Dispatches
              </Link>
              <Link to="/commissiondar/ledger" className="btn btn-ghost" style={{ textAlign: 'center', padding: '12px 10px' }}>
                📖 Mill Ledger
              </Link>
              <Link to="/commissiondar/loans" className="btn btn-ghost" style={{ textAlign: 'center', padding: '12px 10px' }}>
                💰 Farmer Loans
              </Link>
              <Link to="/commissiondar/reports" className="btn btn-ghost" style={{ textAlign: 'center', padding: '12px 10px' }}>
                📊 Audit Reports
              </Link>
            </div>
          </div>

          {/* 2 Activity Columns: Recent Commissions & Recent Loans */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: 20,
            }}
          >
            {/* Column 1: Latest Commission Activity */}
            <div className="panel" style={{ padding: 22, borderRadius: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Latest Commission Activity</h3>
                  <p style={{ color: 'var(--muted)', fontSize: '0.8rem', margin: 0 }}>
                    Commission accruals recorded against partner mills.
                  </p>
                </div>
                <Link to="/commissiondar/ledger" style={{ fontSize: '0.82rem', color: 'var(--green-light)', textDecoration: 'none' }}>
                  View All →
                </Link>
              </div>

              {recentCommissions.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: '0.88rem' }}>
                  No commission entries recorded yet.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {recentCommissions.map(comm => (
                    <div
                      key={comm.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: 'var(--surface-soft)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '0.92rem' }}>{comm.millName}</strong>
                        <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                          {formatDate(comm.date)} {comm.note && `• ${comm.note}`}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: 'var(--gold)', fontWeight: 700 }}>
                          {rupees(comm.amount)}
                        </div>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: comm.pending <= 0 ? 'var(--green-light)' : '#f59e0b',
                          }}
                        >
                          {comm.pending <= 0 ? '✓ Paid' : `Due: ${rupees(comm.pending)}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Column 2: Latest Loan Activity */}
            <div className="panel" style={{ padding: 22, borderRadius: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Latest Farmer Loans</h3>
                  <p style={{ color: 'var(--muted)', fontSize: '0.8rem', margin: 0 }}>
                    Recent loan disbursements and recovery status.
                  </p>
                </div>
                <Link to="/commissiondar/loans" style={{ fontSize: '0.82rem', color: 'var(--green-light)', textDecoration: 'none' }}>
                  View All →
                </Link>
              </div>

              {recentLoans.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: '0.88rem' }}>
                  No active farmer loans recorded.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {recentLoans.map((loan, idx) => {
                    const principal = Number(loan.amount || loan.principal || 0);
                    const balance = Number(loan.outstanding_balance ?? loan.amount ?? 0);
                    const isCleared = balance <= 0;

                    return (
                      <div
                        key={loan.id || idx}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 10,
                          background: 'var(--surface-soft)',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '0.92rem' }}>
                            {loan.farmer_name || loan.farmerName || `Farmer #${loan.farmer_id || idx + 1}`}
                          </strong>
                          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                            Principal: {rupees(principal)}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div
                            style={{
                              fontWeight: 700,
                              color: isCleared ? 'var(--green-light)' : '#f59e0b',
                            }}
                          >
                            {rupees(balance)}
                          </div>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: isCleared ? 'var(--green-light)' : '#f59e0b',
                            }}
                          >
                            {isCleared ? 'SETTLED' : 'ACTIVE'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
