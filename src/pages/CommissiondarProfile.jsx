import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getCommissiondarFarmers,
  getCommissiondarLoans,
  getCommissiondarMills,
} from '../api';

export default function CommissiondarProfile() {
  const { user, token, logout } = useAuth();
  const [farmersCount, setFarmersCount] = useState(0);
  const [activeLoansCount, setActiveLoansCount] = useState(0);
  const [millsCount, setMillsCount] = useState(0);

  useEffect(() => {
    if (!token) return;

    getCommissiondarFarmers(token)
      .then(res => {
        const list = Array.isArray(res) ? res : res?.farmers ?? [];
        setFarmersCount(list.length);
      })
      .catch(() => {});

    getCommissiondarLoans(token)
      .then(res => {
        const list = Array.isArray(res) ? res : res?.loans ?? [];
        const active = list.filter(l => Number(l.outstanding_balance ?? l.amount ?? 0) > 0);
        setActiveLoansCount(active.length);
      })
      .catch(() => {});

    getCommissiondarMills(token, true)
      .then(res => {
        const list = Array.isArray(res) ? res : res?.mills ?? [];
        setMillsCount(list.length);
      })
      .catch(() => {});
  }, [token]);

  return (
    <div className="commissiondar-profile-page" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <p className="dashboard-eyebrow">COMMISSIONDAR / ACCOUNT SETTINGS</p>
        <h1 style={{ margin: '4px 0 8px' }}>Commissiondar Profile & Settings</h1>
        <p style={{ color: 'var(--muted)', margin: 0 }}>
          Manage your trade profile, independent mill references, and security settings.
        </p>
      </div>

      <div
        className="panel"
        style={{
          padding: 28,
          borderRadius: 20,
          border: '1px solid var(--border)',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: 'linear-gradient(135deg, var(--green-light) 0%, #10b981 100%)',
              color: '#05140b',
              display: 'grid',
              placeItems: 'center',
              fontSize: 28,
              fontWeight: 900,
              boxShadow: '0 0 24px rgba(16, 185, 129, 0.4)',
            }}
          >
            C
          </div>

          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{user?.name || 'Commission Agent'}</h2>
            <p
              style={{
                color: 'var(--green-light)',
                margin: '4px 0 0',
                fontWeight: 650,
                fontSize: '0.9rem',
              }}
            >
              ✓ Verified Independent Commissiondar • Agent Account
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          <div style={{ padding: 14, borderRadius: 12, background: 'var(--surface-soft)' }}>
            <span
              style={{
                fontSize: '0.78rem',
                color: 'var(--muted)',
                display: 'block',
                textTransform: 'uppercase',
              }}
            >
              Account Holder
            </span>
            <strong style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>
              {user?.name || 'Commissiondar'}
            </strong>
          </div>

          <div style={{ padding: 14, borderRadius: 12, background: 'var(--surface-soft)' }}>
            <span
              style={{
                fontSize: '0.78rem',
                color: 'var(--muted)',
                display: 'block',
                textTransform: 'uppercase',
              }}
            >
              Registered Phone
            </span>
            <strong style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>
              {user?.phone || 'Connected'}
            </strong>
          </div>

          <div style={{ padding: 14, borderRadius: 12, background: 'var(--surface-soft)' }}>
            <span
              style={{
                fontSize: '0.78rem',
                color: 'var(--muted)',
                display: 'block',
                textTransform: 'uppercase',
              }}
            >
              My Network Farmers
            </span>
            <strong style={{ fontSize: '1.05rem', color: 'var(--green-light)' }}>
              {farmersCount} farmers
            </strong>
          </div>

          <div style={{ padding: 14, borderRadius: 12, background: 'var(--surface-soft)' }}>
            <span
              style={{
                fontSize: '0.78rem',
                color: 'var(--muted)',
                display: 'block',
                textTransform: 'uppercase',
              }}
            >
              Associated Rice Mills
            </span>
            <strong style={{ fontSize: '1.05rem', color: 'var(--gold)' }}>
              {millsCount} mills
            </strong>
          </div>

          <div style={{ padding: 14, borderRadius: 12, background: 'var(--surface-soft)' }}>
            <span
              style={{
                fontSize: '0.78rem',
                color: 'var(--muted)',
                display: 'block',
                textTransform: 'uppercase',
              }}
            >
              Active Farmer Loans
            </span>
            <strong style={{ fontSize: '1.05rem', color: '#f59e0b' }}>
              {activeLoansCount} active
            </strong>
          </div>

          <div style={{ padding: 14, borderRadius: 12, background: 'var(--surface-soft)' }}>
            <span
              style={{
                fontSize: '0.78rem',
                color: 'var(--muted)',
                display: 'block',
                textTransform: 'uppercase',
              }}
            >
              Security Protocol
            </span>
            <strong style={{ fontSize: '1.05rem', color: 'var(--green-light)' }}>
              One Password + OTP
            </strong>
          </div>
        </div>
      </div>

      <div
        className="panel"
        style={{
          padding: 24,
          borderRadius: 18,
          border: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>Active Session</h3>
          <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.85rem' }}>
            All commission and loan records are safely encrypted. Remember to log out when done.
          </p>
        </div>

        <button
          type="button"
          className="top-logout-button"
          onClick={logout}
          style={{ padding: '10px 22px' }}
        >
          Logout of Commissiondar
        </button>
      </div>
    </div>
  );
}
