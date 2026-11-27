
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { registerMiller, describeError } from '../api';
import { GrainStalkIcon, TrendingUpIcon, SiloStorageIcon } from '../components/AgriIcons';

const EyeIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

function MillerRegister() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    businessName: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!/^\d{10}$/.test(form.phone)) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    if (!form.password) {
      setError('Please enter a login password.');
      return;
    }

    setLoading(true);

    try {
      await registerMiller({
        name: form.name.trim(),
        phone: form.phone.trim(),
        businessName: form.businessName.trim(),
        password: form.password,
      });

      setSuccess(true);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-auth-wrap">
      {/* Left side: Branding */}
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
            Miller Onboarding
          </div>
          <h1 className="split-brand-h1">
            Empower Your <span>Rice Milling Operations.</span>
          </h1>
          <p className="split-brand-desc">
            Register your rice mill to manage daily farmer intakes, track live milling stock, handle broker commissions, and generate audited export ledgers.
          </p>

          <div className="split-brand-features">
            <div className="split-feature-item">
              <div className="split-feature-icon-badge">
                <TrendingUpIcon size={19} color="#34d399" />
              </div>
              <div className="split-feature-text">
                <strong>Intake Ledgers</strong>
                <span>Direct intake with moisture & deduction calculations.</span>
              </div>
            </div>
            <div className="split-feature-item">
              <div className="split-feature-icon-badge" style={{ background: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.25)', color: '#f59e0b' }}>
                <SiloStorageIcon size={19} color="#f59e0b" />
              </div>
              <div className="split-feature-text">
                <strong>Silo Stock Tracking</strong>
                <span>Real-time balance of paddy varieties & milled rice.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="split-brand-footer">
          <span>© {new Date().getFullYear()} Grain Ledger Systems</span>
          <span>Verified Mill Registration</span>
        </div>
      </div>

      {/* Right side: Registration Form Card */}
      <div className="split-auth-form-side">
        <div className="split-form-card">
          <div style={{ marginBottom: 20, textAlign: 'left' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.45rem', fontWeight: 800 }}>
              Miller Registration
            </h2>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.86rem' }}>
              Create your rice mill owner account.
            </p>
          </div>

          {error && (
            <div className="lerror lerror-form" role="alert" style={{ marginBottom: 16 }}>
              {error}
            </div>
          )}

          {success ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>✓</div>
              <h3 style={{ color: 'var(--green-light)', margin: '0 0 8px' }}>
                Registration Submitted Successfully!
              </h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: 20 }}>
                Your rice mill account has been sent for administrator review. You will be able to log in once your profile is approved.
              </p>
              <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex' }}>
                Go to Sign In →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', color: '#cbd5e1', marginBottom: 5, fontWeight: 650 }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Ramesh Kumar"
                  value={form.name}
                  onChange={handleChange}
                  disabled={loading}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', color: '#cbd5e1', marginBottom: 5, fontWeight: 650 }}>
                  10-digit Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="9876543210"
                  value={form.phone}
                  onChange={handleChange}
                  maxLength={10}
                  disabled={loading}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', color: '#cbd5e1', marginBottom: 5, fontWeight: 650 }}>
                  Mill / Business Name *
                </label>
                <input
                  type="text"
                  name="businessName"
                  placeholder="e.g. Sri Lakshmi Rice Mill"
                  value={form.businessName}
                  onChange={handleChange}
                  disabled={loading}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', color: '#cbd5e1', marginBottom: 5, fontWeight: 650 }}>
                  Login Password *
                </label>
                <div className="input-with-toggle" style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Create secure password"
                    value={form.password}
                    onChange={handleChange}
                    disabled={loading}
                    style={{ paddingRight: 42 }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="password-toggle-btn"
                  >
                    {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', minHeight: 46, marginTop: 8 }}
              >
                {loading ? 'Submitting registration...' : 'Register as Miller →'}
              </button>
            </form>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(52, 211, 153, 0.15)',
            fontSize: '0.86rem',
          }}>
            <Link to="/register" style={{ color: 'var(--muted)', textDecoration: 'none' }}>
              ← Change Role
            </Link>
            <Link to="/" style={{ color: 'var(--green-glow)', fontWeight: 650, textDecoration: 'none' }}>
              Already registered? Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MillerRegister;
