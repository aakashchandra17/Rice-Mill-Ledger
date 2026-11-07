
import { useState } from 'react';
import { Link } from 'react-router-dom';

function MillerRegister() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    businessName: '',
    password: '',
    secondPassword: '',
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!/^\d{10}$/.test(form.phone)) {
      alert('Please enter a valid 10-digit phone number.');
      return;
    }

    if (!form.password || !form.secondPassword) {
      alert('Please enter both login passwords.');
      return;
    }

    if (form.password === form.secondPassword) {
      alert('Please use two different passwords.');
      return;
    }

    alert(
      'Miller registration form completed. Backend registration API is not yet connected.'
    );
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>GRAIN LEDGER</h1>
        <p>RICE MILL MANAGEMENT</p>

        <h2>Miller Registration</h2>
        <p>Create your rice mill account.</p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            required
          />

          <input
            type="tel"
            name="phone"
            placeholder="10-digit Phone Number"
            value={form.phone}
            onChange={handleChange}
            maxLength={10}
            required
          />

          <input
            type="text"
            name="businessName"
            placeholder="Mill / Business Name"
            value={form.businessName}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Login Password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="secondPassword"
            placeholder="Second Login Password"
            value={form.secondPassword}
            onChange={handleChange}
            required
          />

          <button type="submit">
            Register as Miller
          </button>
        </form>

        <p>
          <Link to="/register">Back</Link>
          {' | '}
          <Link to="/">Already registered? Login</Link>
        </p>
      </div>
    </div>
  );
}

export default MillerRegister;
