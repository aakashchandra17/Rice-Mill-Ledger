
import { Link } from 'react-router-dom';
import {
  GrainStalkIcon,
  MillFactoryIcon,
  FarmerAvatarIcon,
  TenantShieldIcon,
  SpeedBoltIcon,
} from '../components/AgriIcons';

function Register() {
  return (
    <div className="split-auth-wrap">
      {/* Left side: Branding and agricultural visual */}
      <div className="split-auth-brand">
        <div className="split-brand-header">
          <div className="split-brand-logo">
            <GrainStalkIcon size={26} color="#f59e0b" />
          </div>
          <div>
            <div className="split-brand-title">GRAIN LEDGER</div>
            <div className="split-brand-subtitle">Smart Agricultural ERP</div>
          </div>
        </div>

        <div className="split-brand-hero">
          <div className="split-brand-tagline-badge">
            <span className="dot" />
            Smart Grain. Smarter Management.
          </div>
          <h1 className="split-brand-h1">
            Join the Modern <span>Agricultural Commodity Ledger.</span>
          </h1>
          <p className="split-brand-desc">
            Whether you operate a rice mill or manage an independent commission agency, Grain Ledger provides dedicated, completely decoupled tools to run your enterprise smoothly.
          </p>

          <div className="split-brand-features">
            <div className="split-feature-item">
              <div className="split-feature-icon-badge">
                <MillFactoryIcon size={19} color="#34d399" />
              </div>
              <div className="split-feature-text">
                <strong>Rice Mill Operators</strong>
                <span>Intake logs, milling yields, broker commissions, and exports.</span>
              </div>
            </div>

            <div className="split-feature-item">
              <div className="split-feature-icon-badge" style={{ background: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.25)', color: '#f59e0b' }}>
                <FarmerAvatarIcon size={19} color="#f59e0b" />
              </div>
              <div className="split-feature-text">
                <strong>Commission Agents</strong>
                <span>Farmer crop advances, yard stock silo, and mill dispatch ledgers.</span>
              </div>
            </div>

            <div className="split-feature-item">
              <div className="split-feature-icon-badge">
                <TenantShieldIcon size={19} color="#34d399" />
              </div>
              <div className="split-feature-text">
                <strong>Zero Account Linking</strong>
                <span>Strict privacy and decoupled multi-tenant architecture.</span>
              </div>
            </div>

            <div className="split-feature-item">
              <div className="split-feature-icon-badge" style={{ background: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.25)', color: '#38bdf8' }}>
                <SpeedBoltIcon size={19} color="#38bdf8" />
              </div>
              <div className="split-feature-text">
                <strong>Instant Approvals</strong>
                <span>Direct onboarding verified by system administrators.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="split-brand-footer">
          <span>© {new Date().getFullYear()} Grain Ledger Systems</span>
          <span>Enterprise Agritech Platform</span>
        </div>
      </div>

      {/* Right side: Account Type Selection Form */}
      <div className="split-auth-form-side">
        <div className="split-form-card">
          <div style={{ marginBottom: 24, textAlign: 'left' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.5rem', fontWeight: 800 }}>
              Create Your Account
            </h2>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.88rem' }}>
              Select your role in the grain supply chain to get started.
            </p>
          </div>

          <div style={{ display: 'grid', gap: 14, marginBottom: 24 }}>
            <Link
              to="/register/miller"
              className="split-feature-item"
              style={{
                textDecoration: 'none',
                padding: '18px 20px',
                border: '1.5px solid rgba(52, 211, 153, 0.3)',
                background: 'rgba(16, 36, 26, 0.75)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="split-feature-icon-badge" style={{ width: 44, height: 44, borderRadius: 12 }}>
                  <MillFactoryIcon size={24} color="#34d399" />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 2px', fontSize: '1.08rem', color: '#ffffff' }}>Rice Miller</h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--muted)' }}>Register your rice mill business & track intake</p>
                </div>
              </div>
              <span style={{ color: 'var(--green-light)', fontWeight: 700, fontSize: '1.1rem' }}>→</span>
            </Link>

            <Link
              to="/register/commissiondar"
              className="split-feature-item"
              style={{
                textDecoration: 'none',
                padding: '18px 20px',
                border: '1.5px solid rgba(251, 191, 36, 0.3)',
                background: 'rgba(28, 26, 14, 0.65)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  className="split-feature-icon-badge"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'rgba(245, 158, 11, 0.12)',
                    borderColor: 'rgba(245, 158, 11, 0.25)',
                    color: '#f59e0b',
                  }}
                >
                  <FarmerAvatarIcon size={24} color="#f59e0b" />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 2px', fontSize: '1.08rem', color: '#ffffff' }}>Commissiondar</h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--muted)' }}>Create your independent commission agency</p>
                </div>
              </div>
              <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '1.1rem' }}>→</span>
            </Link>
          </div>

          <div style={{
            textAlign: 'center',
            paddingTop: '18px',
            borderTop: '1px solid rgba(52, 211, 153, 0.15)',
            fontSize: '0.9rem',
            color: 'var(--ink-soft)',
          }}>
            Already registered on Grain Ledger?{' '}
            <Link to="/" style={{ color: 'var(--green-glow)', fontWeight: 650, textDecoration: 'none' }}>
              Sign In →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
