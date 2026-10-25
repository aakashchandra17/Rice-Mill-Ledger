
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { t } from '../strings';

const Icon = ({ children, size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const MillerIcon = () => (
  <Icon>
    <path d="M3 21h18" />
    <path d="M5 21V9l7-5 7 5v12" />
    <path d="M9 21v-6h6v6" />
    <path d="M9 10h.01M15 10h.01" />
  </Icon>
);

const CommissiondarIcon = () => (
  <Icon>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
  </Icon>
);

const PhoneIcon = () => (
  <Icon>
    <rect x="7" y="2" width="10" height="20" rx="2.5" />
    <path d="M11 18h2" />
  </Icon>
);

const ArrowIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12h8M13 8l4 4-4 4" />
  </Icon>
);

const GrainIcon = () => (
  <Icon size={44}>
    <ellipse
      cx="12"
      cy="12"
      rx="9"
      ry="4"
      transform="rotate(-45 12 12)"
    />
    <path d="M7 17L17 7" />
  </Icon>
);

export default function Login() {
  const [loginType, setLoginType] = useState('owner');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const { login, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  const switchType = type => {
    setLoginType(type);
    setErrors({});
  };

  const handleSubmit = async e => {
    e.preventDefault();

    const found = {};

    if (!/^\d{10}$/.test(phone)) {
      found.phone = t.phoneError;
    }

    setErrors(found);

    if (Object.keys(found).length > 0) return;

    setLoading(true);

    try {
      const user = await login(phone, loginType);

      if (user.role === 'owner') {
        navigate('/dashboard');
      } else if (user.role === 'party') {
        navigate('/commissiondar');
      } else {
        setErrors({
          form: 'Your account has an unsupported role. Please contact support.',
        });
      }
    } catch (err) {
      if (err.status === 401) {
        setErrors({
          form: 'Phone number not recognized. Please check and try again.',
        });
      } else if (err.status === 403) {
        setErrors({
          form: 'You are not allowed to access this section.',
        });
      } else {
        setErrors({
          form: err.message || 'Login failed. Please try again.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <motion.div
        className="lcard"
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <h1 className="sr-only">{t.loginTitle}</h1>

        <div className="lcard-banner">
          <div className="lcard-brand">{t.loginTitle}</div>
          <div className="lcard-logo">
            <GrainIcon />
          </div>
        </div>

        <div className="ltabs" role="tablist" aria-label="Choose login type">
          <button
            type="button"
            role="tab"
            id="tab-owner"
            className="ltab"
            aria-selected={loginType === 'owner'}
            onClick={() => switchType('owner')}
          >
            <MillerIcon />
            Miller Login
          </button>

          <button
            type="button"
            role="tab"
            id="tab-party"
            className="ltab"
            aria-selected={loginType === 'party'}
            onClick={() => switchType('party')}
          >
            <CommissiondarIcon />
            Commissiondhar Login
          </button>
        </div>

        <form
          className="lbody"
          role="tabpanel"
          aria-labelledby={`tab-${loginType}`}
          onSubmit={handleSubmit}
          noValidate
        >
          {sessionExpired && (
            <div className="lnotice" role="alert">
              {t.sessionExpired}
            </div>
          )}

          <div>
            <div className={`lfield ${errors.phone ? 'invalid' : ''}`}>
              <label htmlFor="phone">{t.phoneLabel}</label>

              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={10}
                placeholder={t.phonePlaceholder}
                value={phone}
                onChange={e => {
                  setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                  setErrors(prev => ({
                    ...prev,
                    phone: undefined,
                    form: undefined,
                  }));
                }}
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? 'phone-error' : undefined}
              />

              <span className="ficon">
                <PhoneIcon />
              </span>
            </div>

            {errors.phone && (
              <div id="phone-error" className="lerror" role="alert">
                {errors.phone}
              </div>
            )}
          </div>

          {errors.form && (
            <div className="lerror lerror-form" role="alert">
              {errors.form}
            </div>
          )}

          <button type="submit" className="lbtn" disabled={loading}>
            <ArrowIcon />
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
