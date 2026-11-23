
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { registerCommissiondar, describeError } from '../api';

function CommissiondarRegister() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    password: '',
    secondPassword: '',
  });
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

    if (!form.password || !form.secondPassword) {
      setError('Please enter both login passwords.');
      return;
    }

    if (form.password === form.secondPassword) {
      setError('Please use two different passwords.');
      return;
    }

    setLoading(true);

    try {
      await registerCommissiondar({
        name: form.name.trim(),
        phone: form.phone.trim(),
        password: form.password,
        secondPassword: form.secondPassword,
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

            <input
              type="password"
              name="password"
              placeholder="Login Password"
              value={form.password}
              onChange={handleChange}
              disabled={loading}
              required
            />

            <input
              type="password"
              name="secondPassword"
              placeholder="Second Login Password"
              value={form.secondPassword}
              onChange={handleChange}
              disabled={loading}
              required
            />

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
