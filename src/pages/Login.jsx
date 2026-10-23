import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { t } from '../strings';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, sessionExpired } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    if (phone.length !== 10) {
      setError(t.phoneError);
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(phone);
      navigate('/dashboard');
    } catch {
      setError(t.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">{t.loginTitle}</div>
        <p className="login-sub">{t.loginSub}</p>

        {sessionExpired && (
          <div className="login-notice" role="alert">{t.sessionExpired}</div>
        )}

        <label htmlFor="phone">{t.phoneLabel}</label>
        <input
          id="phone"
          type="tel"
          inputMode="numeric"
          maxLength={10}
          placeholder={t.phonePlaceholder}
          value={phone}
          onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
        />
        {error && <div className="login-error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? t.signingIn : t.loginButton}
        </button>
      </form>
    </div>
  );
}