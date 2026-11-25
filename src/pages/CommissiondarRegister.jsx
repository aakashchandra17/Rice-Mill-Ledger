
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { registerCommissiondar, describeError } from '../api';

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

function CommissiondarRegister() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
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
      await registerCommissiondar({
        name: form.name.trim(),
        phone: form.phone.trim(),
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
    <div className="login-page">
      <div className="login-card">
        <h1>GRAIN LEDGER</h1>
        <p>RICE MILL MANAGEMENT</p>

        <h2>Commissiondar Registration</h2>
        <p>Create your independent account.</p>

        {error && (
          <p style={{ color: '#e53e3e', background: 'rgba(229,62,62,0.1)', padding: '10px 14px', borderRadius: 6, fontSize: 13 }}>
            {error}
          </p>
        )}

        {success ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <p style={{ color: '#38a169', fontSize: 16, fontWeight: 600 }}>
              ✓ Registration submitted successfully!
            </p>
            <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.5 }}>
              Your account has been submitted for administrator review. You can log in once approved.
            </p>
            <Link to="/" className="top-logout-button" style={{ display: 'inline-block', marginTop: 12, textDecoration: 'none' }}>
              Go to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={form.name}
              onChange={handleChange}
              disabled={loading}
              required
            />

            <input
              type="tel"
              name="phone"
              placeholder="10-digit Phone Number"
              value={form.phone}
              onChange={handleChange}
              maxLength={10}
              disabled={loading}
              required
            />

            <div className="input-with-toggle" style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Login Password"
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

            <button type="submit" disabled={loading}>
              {loading ? 'Submitting registration...' : 'Register as Commissiondar'}
            </button>
          </form>
        )}

        <p style={{ marginTop: 18 }}>
          <Link to="/register">Back</Link>
          {' | '}
          <Link to="/">Already registered? Login</Link>
        </p>
      </div>
    </div>
  );
}

export default CommissiondarRegister;
