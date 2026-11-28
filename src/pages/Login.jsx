
import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { t } from '../strings';
import {
  GrainStalkIcon,
  SiloStorageIcon,
  SettlementScaleIcon,
  TenantShieldIcon,
  MobilePhoneIcon,
} from '../components/AgriIcons';

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

const PhoneIcon = ({ size = 20 }) => (
  <Icon size={size}>
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

const EyeIcon = ({ size = 18 }) => (
  <Icon size={size}>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

const EyeOffIcon = ({ size = 18 }) => (
  <Icon size={size}>
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </Icon>
);

export default function Login() {
  const navigate = useNavigate();

  const [loginType, setLoginType] = useState('owner');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      found.password = 'Please enter your password.';
    }

    setErrors(found);

    if (Object.keys(found).length > 0) return;

    setLoading(true);
    verificationStarted.current = false;

    try {
      await login(phone, password, loginType);

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
            Transforming Grain Operations with <span>Real-time Precision.</span>
          </h1>
          <p className="split-brand-desc">
            The unified commodity ledger for rice mill owners and commission agents. Track paddy intakes, live yard storage, mill dispatches, and financial settlements seamlessly.
          </p>

          <div className="split-brand-features">
            <div className="split-feature-item">
              <div className="split-feature-icon-badge">
                <SiloStorageIcon size={19} color="#34d399" />
              </div>
              <div className="split-feature-text">
                <strong>Live Inventory Silo</strong>
                <span>Real-time visual stock tracking per crop variety.</span>
              </div>
            </div>

            <div className="split-feature-item">
              <div className="split-feature-icon-badge" style={{ background: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.25)', color: '#f59e0b' }}>
                <SettlementScaleIcon size={19} color="#f59e0b" />
              </div>
              <div className="split-feature-text">
                <strong>Settlement Engine</strong>
                <span>Instant net payables & loan balance resolution.</span>
              </div>
            </div>

            <div className="split-feature-item">
              <div className="split-feature-icon-badge">
                <TenantShieldIcon size={19} color="#34d399" />
              </div>
              <div className="split-feature-text">
                <strong>Tenant Separation</strong>
                <span>Independent Miller and Commissiondar records.</span>
              </div>
            </div>

            <div className="split-feature-item">
              <div className="split-feature-icon-badge" style={{ background: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.25)', color: '#38bdf8' }}>
                <MobilePhoneIcon size={19} color="#38bdf8" />
              </div>
              <div className="split-feature-text">
                <strong>Mobile-First Design</strong>
                <span>Access your yard ledger anywhere, on any device.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="split-brand-footer">
          <span>© {new Date().getFullYear()} Grain Ledger Systems</span>
          <span>Verified Enterprise Security • MSG91 OTP Protected</span>
        </div>
      </div>

      {/* Right side: Authentication Form Card */}
      <div className="split-auth-form-side">
        <motion.div
          className="split-form-card"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div style={{ marginBottom: 20, textAlign: 'left' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.45rem', fontWeight: 800 }}>
              {loginType === 'admin' ? 'Administrator Login' : loginType === 'owner' ? 'Miller Sign In' : 'Commissiondar Sign In'}
            </h2>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.86rem' }}>
              Sign in with your registered mobile number and password.
            </p>
          </div>

          {!otpStage && loginType !== 'admin' && (
            <div className="ltabs" role="tablist" aria-label="Choose login type" style={{ marginBottom: 18, marginTop: 0, borderRadius: 14 }}>
              <button
                type="button"
                role="tab"
                id="tab-owner"
                className="ltab"
                aria-selected={loginType === 'owner'}
                onClick={() => switchType('owner')}
              >
                <MillerIcon />
                Miller
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
                Commissiondar
              </button>
            </div>
          )}

          {!otpStage && loginType === 'admin' && (
            <div style={{ textAlign: 'center', padding: '8px 16px 16px' }}>
              <p style={{ margin: 0, color: 'var(--gold)', fontSize: '0.85rem', fontWeight: 650 }}>
                🔒 Authorized Grain Ledger System Administrators Only
              </p>
            </div>
          )}

          {sessionExpired && (
            <div className="lnotice" role="alert" style={{ marginBottom: 16 }}>
              {t.sessionExpired}
            </div>
          )}

          {!otpStage ? (
            <form
              className="lbody"
              style={{ padding: 0 }}
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
                  <span className="ficon"><PhoneIcon size={20} /></span>
                </div>

                {errors.phone && <div className="lerror">{errors.phone}</div>}
              </div>

              <div>
                <div className={`lfield ${errors.password ? 'invalid' : ''}`}>
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter password"
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
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="password-toggle-btn"
                  >
                    {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                  </button>
                </div>

                {errors.password && <div className="lerror">{errors.password}</div>}
              </div>

              {errors.form && (
                <div className="lerror lerror-form" role="alert">
                  {errors.form}
                </div>
              )}

              <button type="submit" className="lbtn" disabled={loading} style={{ marginTop: 4 }}>
                <ArrowIcon />
                {loading ? 'Verifying...' : 'Continue'}
              </button>
            </form>
          ) : (
            <div className="lbody" style={{ padding: 0 }}>
              <h3 style={{ margin: '0 0 6px' }}>MSG91 OTP Verification</h3>

              <p style={{ color: 'var(--muted)', fontSize: '0.88rem', margin: 0 }}>
                Complete the OTP verification in the MSG91 widget.
              </p>

              {msg91Status === 'opening' && (
                <p role="status" style={{ color: 'var(--gold)', fontSize: '0.9rem' }}>
                  ⏳ Opening MSG91 verification widget...
                </p>
              )}

              {msg91Status === 'verifying' && (
                <div className="lnotice" role="status">
                  ✓ OTP verified. Connecting securely to Grain Ledger...
                </div>
              )}

              {msg91Status === 'success' && (
                <div className="lnotice" role="status">
                  ✓ Login successful. Opening your dashboard...
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
                className="btn btn-secondary"
                onClick={handleBack}
                disabled={loading || verifying}
                style={{ marginTop: 12 }}
              >
                ← Back to Login
              </button>
            </div>
          )}

          {!otpStage && loginType !== 'admin' && (
            <div style={{
              textAlign: 'center',
              marginTop: '18px',
              fontSize: '15px',
              padding: '6px 0',
              lineHeight: '1.5',
              color: 'var(--ink-soft)',
              borderTop: '1px solid rgba(52, 211, 153, 0.15)',
              paddingTop: '16px',
            }}>
              New to Grain Ledger?{' '}
              <Link
                to="/register"
                style={{
                  color: 'var(--green-glow)',
                  fontWeight: 650,
                  textDecoration: 'none',
                }}
              >
                Create an account →
              </Link>
            </div>
          )}

          {!otpStage && (
            <div style={{
              textAlign: 'center',
              paddingTop: '10px',
            }}>
              {loginType === 'admin' ? (
                <button
                  type="button"
                  onClick={() => switchType('owner')}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: 'var(--muted)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '13px',
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
                    gap: '6px',
                    border: 'none',
                    background: 'none',
                    color: 'var(--gold)',
                    fontWeight: 650,
                    cursor: 'pointer',
                    fontSize: '13px',
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
    </div>
  );
}
