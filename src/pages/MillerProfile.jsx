import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export default function MillerProfile() {
  const { user, logout } = useAuth();
  const { farmers } = useData();

  return (
    <div className="miller-profile-page" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <p className="dashboard-eyebrow">MILLER / ACCOUNT SETTINGS</p>
        <h1 style={{ margin: '4px 0 8px' }}>Rice Mill Profile & Settings</h1>
        <p style={{ color: 'var(--muted)', margin: 0 }}>
          Manage your business credentials, contact information, and active session.
        </p>
      </div>

      <div className="panel" style={{ padding: 28, borderRadius: 20, border: '1px solid var(--border)', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-glow) 100%)',
              color: '#05140b',
              display: 'grid',
              placeItems: 'center',
              fontSize: 28,
              fontWeight: 900,
              boxShadow: '0 0 24px rgba(251, 191, 36, 0.4)',
            }}
          >
            M
          </div>

          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{user?.business_name || user?.name || 'My Rice Mill'}</h2>
            <p style={{ color: 'var(--green-light)', margin: '4px 0 0', fontWeight: 650, fontSize: '0.9rem' }}>
              ✓ Verified Rice Mill Operator • Owner Account
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div style={{ padding: 14, borderRadius: 12, background: 'var(--surface-soft)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>
              Owner Name
            </span>
            <strong style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>{user?.name || 'Mill Owner'}</strong>
          </div>

          <div style={{ padding: 14, borderRadius: 12, background: 'var(--surface-soft)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>
              Registered Mobile
            </span>
            <strong style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>{user?.phone || 'Connected'}</strong>
          </div>

          <div style={{ padding: 14, borderRadius: 12, background: 'var(--surface-soft)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>
              Managed Farmers
            </span>
            <strong style={{ fontSize: '1.05rem', color: 'var(--green-light)' }}>{farmers.length} farmers</strong>
          </div>

          <div style={{ padding: 14, borderRadius: 12, background: 'var(--surface-soft)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>
              Security & Auth
            </span>
            <strong style={{ fontSize: '1.05rem', color: 'var(--gold)' }}>MSG91 Dual Password</strong>
          </div>
        </div>
      </div>

      <div className="panel" style={{ padding: 24, borderRadius: 18, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0 }}>Active Session</h3>
          <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.85rem' }}>
            Logged in securely. To protect your mill records, remember to log out when done.
          </p>
        </div>

        <button
          type="button"
          className="top-logout-button"
          onClick={logout}
          style={{ padding: '10px 22px' }}
        >
          Logout of Mill
        </button>
      </div>
    </div>
  );
}
