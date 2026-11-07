
import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { t } from '../strings';

const MSG91_WIDGET_ID = '366b67694f63393139353833';
const MSG91_TOKEN_AUTH = '588079TBaMoxkCvOE6aeef278P1';

// Mask all response values to protect tokens and credentials.
function maskStructure(value, depth = 0) {
  if (value === null) return null;

  if (typeof value === 'string') return '<masked string>';
  if (typeof value === 'number') return '<number>';
  if (typeof value === 'boolean') return '<boolean>';

  if (Array.isArray(value)) {
    return {
      type: 'array',
      length: value.length,
      items: value.length > 0
        ? maskStructure(value[0], depth + 1)
        : [],
    };
  }

  if (typeof value === 'object') {
    if (depth >= 5) return '<nested object>';

    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        maskStructure(item, depth + 1),
      ])
    );
  }

  return `<${typeof value}>`;
}

// Load MSG91 Web SDK and initialize its widget.
function loadMsg91Widget(configuration) {
  return new Promise((resolve, reject) => {
    const initialize = () => {
      if (typeof window.initSendOTP !== 'function') {
        reject(new Error('MSG91 SDK loaded, but initSendOTP was not found.'));
        return;
      }

      try {
        window.initSendOTP(configuration);
        resolve();
      } catch {
        reject(new Error('Unable to initialize the MSG91 widget.'));
      }
    };

    if (typeof window.initSendOTP === 'function') {
      initialize();
      return;
    }

    const urls = [
      'https://verify.msg91.com/otp-provider.js',
      'https://verify.phone91.com/otp-provider.js',
    ];

    let index = 0;

    const attempt = () => {
      if (index >= urls.length) {
        reject(new Error('Unable to load the MSG91 verification service.'));
        return;
      }

      const script = document.createElement('script');
      script.src = urls[index];
      script.async = true;

      script.onload = initialize;

      script.onerror = () => {
        index += 1;
        attempt();
      };

      document.head.appendChild(script);
    };

    attempt();
  });
}

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

const AdminIcon = () => (
  <Icon>
    <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" />
    <path d="m9 12 2 2 4-4" />
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
  const navigate = useNavigate();

  const [loginType, setLoginType] = useState('owner');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [secondPassword, setSecondPassword] = useState('');
  const [otpStage, setOtpStage] = useState(false);
  const [msg91Status, setMsg91Status] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const verificationStarted = useRef(false);

  const {
    login,
    verifyLoginOtp,
    cancelOtp,
    sessionExpired,
  } = useAuth();

  const reduce = useReducedMotion();

  const switchType = type => {
    cancelOtp();
    verificationStarted.current = false;

    setLoginType(type);
    setOtpStage(false);
    setMsg91Status('');
    setErrors({});
    setPassword('');
    setSecondPassword('');
  };

  // STEP 1: Submit credentials and request backend challenge.
  // STEP 2: Initialize MSG91 OTP widget.
  const handleSubmit = async e => {
    e.preventDefault();

    const found = {};

    if (!/^\d{10}$/.test(phone)) {
      found.phone = t.phoneError;
    }

    if (!password.trim()) {
      found.password = 'Please enter your first password.';
    }

    if (!secondPassword.trim()) {
      found.secondPassword = 'Please enter your second password.';
    }

    setErrors(found);

    if (Object.keys(found).length > 0) return;

    setLoading(true);
    verificationStarted.current = false;

    try {
      await login(phone, password, secondPassword, loginType);

      setOtpStage(true);
      setMsg91Status('opening');
      setErrors({});

      const configuration = {
        widgetId: MSG91_WIDGET_ID,
        tokenAuth: MSG91_TOKEN_AUTH,
        identifier: `91${phone}`,
        exposeMethods: false,

        // MSG91 success callback.
        // data.message is the MSG91 access token.
        success: async data => {
          if (verificationStarted.current) return;

          if (
            typeof data?.message !== 'string' ||
            !data.message.trim()
          ) {
            setMsg91Status('failed');
            setErrors({
              form: 'MSG91 did not return a valid verification token.',
            });
            return;
          }

          verificationStarted.current = true;
          setVerifying(true);
          setMsg91Status('verifying');
          setErrors({});

          console.log(
            'MSG91 success response keys:',
            Object.keys(data || {})
          );

          console.log(
            'MSG91 masked response structure:',
            maskStructure(data)
          );

          try {
            // Send MSG91 token to the Grain Ledger backend.
            const result = await verifyLoginOtp(data.message);

            const destinations = {
              owner: '/dashboard',
              party: '/commissiondar',
              admin: '/admin',
            };

            const destination = destinations[result?.loginType];

            if (!destination) {
              throw new Error(
                'Unsupported account type. Please log in again.'
              );
            }

            setMsg91Status('success');

            // Navigate to the correct dashboard.
            navigate(destination, { replace: true });
          } catch (err) {
            verificationStarted.current = false;
            setMsg91Status('failed');

            setErrors({
              form:
                err.message ||
                'Backend OTP verification failed. Please try again.',
            });
          } finally {
            setVerifying(false);
          }
        },

        failure: error => {
          verificationStarted.current = false;

          console.error(
            'MSG91 failure response keys:',
            Object.keys(error || {})
          );

          console.error(
            'MSG91 masked failure structure:',
            maskStructure(error)
          );

          setMsg91Status('failed');

          setErrors({
            form: 'MSG91 verification failed. Please try again.',
          });
        },
      };

      await loadMsg91Widget(configuration);
    } catch (err) {
      setErrors({
        form: err.message || 'Unable to start verification. Please try again.',
      });

      setMsg91Status('failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    verificationStarted.current = false;

    cancelOtp();
    setOtpStage(false);
    setMsg91Status('');
    setErrors({});
    setVerifying(false);
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

        {!otpStage && loginType !== 'admin' && (
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
        )}

        {!otpStage && loginType === 'admin' && (
          <div style={{ textAlign: 'center', padding: '12px 16px 0' }}>
            <h3 id="tab-admin">Grain Ledger Admin Login</h3>
            <p>Authorized administrators only</p>
          </div>
        )}

        {sessionExpired && (
          <div className="lnotice" role="alert">
            {t.sessionExpired}
          </div>
        )}

        {!otpStage ? (
          <form
            className="lbody"
            role="tabpanel"
            aria-labelledby={
              loginType === 'admin' ? 'tab-admin' : `tab-${loginType}`
            }
            onSubmit={handleSubmit}
            noValidate
          >
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
                />
                <span className="ficon"><PhoneIcon /></span>
              </div>

              {errors.phone && <div className="lerror">{errors.phone}</div>}
            </div>

            <div>
              <div className={`lfield ${errors.password ? 'invalid' : ''}`}>
                <label htmlFor="password">First Password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter first password"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    setErrors(prev => ({
                      ...prev,
                      password: undefined,
                      form: undefined,
                    }));
                  }}
                />
              </div>

              {errors.password && <div className="lerror">{errors.password}</div>}
            </div>

            <div>
              <div className={`lfield ${errors.secondPassword ? 'invalid' : ''}`}>
                <label htmlFor="secondPassword">Second Password</label>
                <input
                  id="secondPassword"
                  type="password"
                  autoComplete="off"
                  placeholder="Enter second password"
                  value={secondPassword}
                  onChange={e => {
                    setSecondPassword(e.target.value);
                    setErrors(prev => ({
                      ...prev,
                      secondPassword: undefined,
                      form: undefined,
                    }));
                  }}
                />
              </div>

              {errors.secondPassword && (
                <div className="lerror">{errors.secondPassword}</div>
              )}
            </div>

            {errors.form && (
              <div className="lerror lerror-form" role="alert">
                {errors.form}
              </div>
            )}

            <button type="submit" className="lbtn" disabled={loading}>
              <ArrowIcon />
              {loading ? 'Verifying...' : 'Continue'}
            </button>
          </form>
        ) : (
          <div className="lbody">
            <h3>MSG91 OTP Verification</h3>

            <p>
              Complete the OTP verification in the MSG91 widget.
            </p>

            {msg91Status === 'opening' && (
              <p role="status">Opening MSG91 verification...</p>
            )}

            {msg91Status === 'verifying' && (
              <div className="lnotice" role="status">
                OTP verified. Connecting securely to Grain Ledger...
              </div>
            )}

            {msg91Status === 'success' && (
              <div className="lnotice" role="status">
                Login successful. Opening your dashboard...
              </div>
            )}

            {msg91Status === 'failed' && (
              <div className="lerror lerror-form" role="alert">
                {errors.form || 'Verification could not be completed.'}
              </div>
            )}

            {errors.form && msg91Status !== 'failed' && (
              <div className="lerror lerror-form" role="alert">
                {errors.form}
              </div>
            )}

            <button
              type="button"
              className="ltab"
              onClick={handleBack}
              disabled={loading || verifying}
            >
              Back to Login
            </button>
          </div>
        )}

        {!otpStage && loginType !== 'admin' && (
          <div style={{
            textAlign: 'center',
            marginTop: '1px',
            fontSize: '16px',
            padding: '0 16px 6px',
            lineHeight: '1.5',
            marginBottom: '10px',
          }}>
            New to Grain Ledger?{' '}
            <Link
              to="/register"
              style={{
                color: '#053115',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Create an account
            </Link>
          </div>
        )}

        {!otpStage && (
          <div style={{
            textAlign: 'center',
            padding: '0 16px 14px',
          }}>
            {loginType === 'admin' ? (
              <button
                type="button"
                onClick={() => switchType('owner')}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#294536',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                ← Back to User Login
              </button>
            ) : (
              <button
                type="button"
                onClick={() => switchType('admin')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  border: 'none',
                  background: 'none',
                  color: '#294536',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                <AdminIcon />
                Admin Login
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
