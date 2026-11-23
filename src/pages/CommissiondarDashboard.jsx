import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getCommissiondarDashboard,
  getCommissiondarLoans,
  getCommissiondarFarmers,
  describeError,
} from '../api';
import { useAuth } from '../context/AuthContext';

const rupees = value =>
  '₹' + Number(value || 0).toLocaleString('en-IN');
const number = value =>
  Number(value || 0).toLocaleString('en-IN');

export default function CommissiondarDashboard() {
  const { token, user } = useAuth();

  const [data, setData] = useState(null);
  const [loans, setLoans] = useState([]);
  const [farmersCount, setFarmersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFallback, setIsFallback] = useState(false);

  const userKey = user?.id || user?.phone || 'default';
  const millsStorageKey = `commissiondar_mills_${userKey}`;
  const ledgerStorageKey = `commissiondar_ledger_${userKey}`;

  const loadDashboard = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError('Please log in again to view your dashboard.');
      return;
    }

    setLoading(true);
    setError('');
    setIsFallback(false);

    // 1. Try primary backend dashboard endpoint
    let dashboardSuccess = false;
    try {
      const result = await getCommissiondarDashboard(token);
      if (result && typeof result === 'object') {
        setData(result);
        dashboardSuccess = true;
      }
    } catch (dashErr) {
      console.warn(
        'Backend /api/commissiondar-dashboard endpoint failed, calculating live from loans and ledger:',
        dashErr
      );
    }

    // 2. Fetch loans and network data (for tables and fallback calculation)
    try {
      const loansRes = await getCommissiondarLoans(token);
      const loansList = Array.isArray(loansRes)
        ? loansRes
        : loansRes?.loans ?? [];
      setLoans(loansList);

      // If backend dashboard endpoint failed or was incomplete, calculate from live loan records
      if (!dashboardSuccess) {
        let totalLent = 0;
        let totalOutstanding = 0;
        let activeLoans = 0;

        loansList.forEach(l => {
          const principal = Number(l.amount || 0);
          const balance = Number(l.outstanding_balance ?? l.amount ?? 0);
          totalLent += principal;
          totalOutstanding += balance;
          if (balance > 0) activeLoans += 1;
        });

        // Compute pending commissions from manual mill ledger
        let pendingCommissions = 0;
        try {
          const saved = localStorage.getItem(ledgerStorageKey);
          if (saved) {
            const entries = JSON.parse(saved);
            let accrued = 0;
            let received = 0;
            entries.forEach(e => {
              if (e.type === 'accrual') accrued += Number(e.amount || 0);
              if (e.type === 'receipt') received += Number(e.amount || 0);
            });
            pendingCommissions = Math.max(0, accrued - received);
          }
        } catch {}

        setData({
          active_loans: activeLoans,
          total_lent_out: totalLent,
          total_outstanding: totalOutstanding,
          commissions_pending: pendingCommissions,
        });
        setIsFallback(true);
      }
    } catch (loanErr) {
      if (!dashboardSuccess) {
        setError(describeError(loanErr));
      }
    }

    // 3. Fetch farmers count for network overview
    try {
      const farmersRes = await getCommissiondarFarmers(token);
      const farmersList = Array.isArray(farmersRes)
        ? farmersRes
        : farmersRes?.farmers ?? [];
      setFarmersCount(farmersList.length);
    } catch {}

    setLoading(false);
  }, [token, ledgerStorageKey]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Mill count from local storage
  const millsCount = (() => {
    try {
      const saved = localStorage.getItem(millsStorageKey);
      return saved ? JSON.parse(saved).filter(m => m.isActive !== false).length : 0;
    } catch {
      return 0;
    }
  })();

  const metrics = [
    {
      label: 'Active Farmer Loans',
      value: number(data?.active_loans),
      icon: '📋',
      description: 'Currently outstanding loans',
      tone: 'var(--gold)',
    },
    {
      label: 'Total Lent Out',
      value: rupees(data?.total_lent_out),
      icon: '💰',
      description: 'Total capital disbursed to farmers',
      tone: 'var(--green-light)',
    },
    {
      label: 'Total Outstanding',
      value: rupees(data?.total_outstanding),
      icon: '📊',
      description: 'Loan principal yet to be recovered',
      tone: '#f59e0b',
    },
    {
      label: 'Pending Mill Commissions',
      value: rupees(data?.commissions_pending),
      icon: '⏳',
      description: 'Commission amount awaiting settlement',
      tone: '#60a5fa',
    },
  ];

  const quickLinks = [
    {
      to: '/commissiondar/farmers',
      label: 'My Farmers',
      count: `${farmersCount} Farmers`,
      icon: '👨‍🌾',
      desc: 'View & register farmers in your network',
    },
    {
      to: '/commissiondar/grain-types',
      label: 'Custom Grains',
      icon: '🌾',
      desc: 'Define crop varieties & measuring units',
    },
    {
      to: '/commissiondar/stock',
      label: 'Stock Dispatches',
      icon: '📦',
      desc: 'Receive from farmers & deliver to mills',
    },
    {
      to: '/commissiondar/mills',
      label: 'My Mills',
      count: `${millsCount} Mills`,
      icon: '🏭',
      desc: 'Manage rice mills & farmer associations',
    },
    {
      to: '/commissiondar/ledger',
      label: 'Mill Ledger',
      icon: '📖',
      desc: 'Accrue commissions & track receipts',
    },
    {
      to: '/commissiondar/loans',
      label: 'Farmer Loans',
      count: `${loans.length} Loans`,
      icon: '💰',
      desc: 'Disburse loans & record repayments',
    },
    {
      to: '/commissiondar/reports',
      label: 'Performance Reports',
      icon: '📊',
      desc: 'Audit stock movements & balances',
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
            Real-time overview of farmer loans, mill dispatches, and accrued commissions.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.82rem',
              color: 'var(--green-light)',
              background: 'rgba(16, 185, 129, 0.1)',
              padding: '6px 12px',
              borderRadius: 20,
              border: '1px solid rgba(16, 185, 129, 0.25)',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--green-light)',
                boxShadow: '0 0 8px var(--green-light)',
              }}
            />
            Connected
          </span>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={loadDashboard}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {isFallback && (
        <div
          style={{
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            padding: '10px 16px',
            borderRadius: 12,
            marginBottom: 20,
            fontSize: '0.85rem',
            color: '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span>ℹ️</span>
          <span>
            Dashboard metrics calculated live from your active loan ledgers and mill records.
          </span>
        </div>
      )}

      {loading && (
        <div className="panel" style={{ padding: 32, textAlign: 'center' }}>
          <p style={{ margin: 0 }}>Loading commissiondar workspace...</p>
        </div>
      )}

      {error && !data && (
        <div className="panel" role="alert" style={{ padding: 24, textAlign: 'center' }}>
          <h3 style={{ marginTop: 0 }}>Unable to load dashboard</h3>
          <p style={{ color: 'var(--muted)' }}>{error}</p>
          <button type="button" className="btn btn-primary" onClick={loadDashboard}>
            Try Again
          </button>
        </div>
      )}

      {!loading && data && (
        <>
          {/* Top 4 Metrics Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: 16,
              marginBottom: 24,
            }}
          >
            {metrics.map(metric => (
              <div
                className="panel"
                key={metric.label}
                style={{
                  padding: 22,
                  borderRadius: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 14,
                  }}
                >
                  <span
                    style={{
                      color: 'var(--muted)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {metric.label}
                  </span>

                  <span style={{ fontSize: 22 }}>{metric.icon}</span>
                </div>

                <div
                  style={{
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    color: metric.tone,
                    margin: '0 0 6px',
                    lineHeight: 1.2,
                  }}
                >
                  {metric.value}
                </div>

                <p
                  style={{
                    color: 'var(--muted)',
                    fontSize: '0.78rem',
                    margin: 0,
                  }}
                >
                  {metric.description}
                </p>
              </div>
            ))}
          </div>

          {/* Quick Action Navigation Grid */}
          <div className="panel" style={{ padding: 24, borderRadius: 18, marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 6px' }}>Quick Management Hub</h3>
            <p style={{ color: 'var(--muted)', margin: '0 0 18px', fontSize: '0.85rem' }}>
              Access all operational sections of your commission trade account.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 14,
              }}
            >
              {quickLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: 16,
                    borderRadius: 14,
                    background: 'var(--surface-soft)',
                    border: '1px solid var(--border)',
                    textDecoration: 'none',
                    color: 'var(--ink)',
                    transition: 'transform 0.15s ease, border-color 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = 'var(--green-light)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: 'rgba(255, 255, 255, 0.05)',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                  >
                    {link.icon}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <strong style={{ fontSize: '0.95rem' }}>{link.label}</strong>
                      {link.count && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '2px 6px',
                            borderRadius: 8,
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: 'var(--green-light)',
                            fontWeight: 700,
                          }}
                        >
                          {link.count}
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: '0.75rem',
                        color: 'var(--muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {link.desc}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Loans Overview Table */}
          {loans.length > 0 && (
            <div className="panel" style={{ padding: 24, borderRadius: 18 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <div>
                  <h3 style={{ margin: '0 0 4px' }}>Recent Farmer Loan Accounts</h3>
                  <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.85rem' }}>
                    Latest loans issued to network farmers.
                  </p>
                </div>

                <Link
                  to="/commissiondar/loans"
                  className="btn btn-ghost"
                  style={{ fontSize: '0.82rem' }}
                >
                  View All Loans ({loans.length}) →
                </Link>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid var(--border)',
                        color: 'var(--muted)',
                        fontSize: '0.82rem',
                      }}
                    >
                      <th style={{ padding: '10px 14px' }}>FARMER NAME</th>
                      <th style={{ padding: '10px 14px' }}>LOAN PRINCIPAL</th>
                      <th style={{ padding: '10px 14px' }}>OUTSTANDING</th>
                      <th style={{ padding: '10px 14px' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.slice(0, 5).map((loan, idx) => {
                      const principal = Number(loan.amount || 0);
                      const balance = Number(loan.outstanding_balance ?? loan.amount ?? 0);
                      const isCleared = balance <= 0;

                      return (
                        <tr
                          key={loan.id || idx}
                          style={{ borderBottom: '1px solid var(--border)' }}
                        >
                          <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                            {loan.farmer_name || loan.farmerName || `Farmer #${loan.farmer_id || idx + 1}`}
                          </td>
                          <td style={{ padding: '10px 14px' }}>{rupees(principal)}</td>
                          <td
                            style={{
                              padding: '10px 14px',
                              fontWeight: 700,
                              color: isCleared ? 'var(--green-light)' : '#f59e0b',
                            }}
                          >
                            {rupees(balance)}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: isCleared
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : 'rgba(245, 158, 11, 0.15)',
                                color: isCleared ? 'var(--green-light)' : '#f59e0b',
                              }}
                            >
                              {isCleared ? 'SETTLED' : 'ACTIVE'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
