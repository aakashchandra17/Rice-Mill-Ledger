import { useState, useEffect } from 'react';
import AdminDashboard from './pages/AdminDashboard';
import {
  Routes,
  Route,
  NavLink,
  useLocation,
  Navigate,
} from 'react-router-dom';

import ParticleBackground from './components/ParticleBackground';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

import Login from './pages/Login';
import Register from './pages/Register';
import MillerRegister from './pages/MillerRegister';
import CommissiondarRegister from './pages/CommissiondarRegister';

// Miller pages
import Dashboard from './pages/Dashboard';
import Farmers from './pages/Farmers';
import FarmerDetail from './pages/FarmerDetail';
import MillerGrains from './pages/MillerGrains';
import MillerInventory from './pages/MillerInventory';
import RecordIntake from './pages/RecordIntake';
import RecordPayment from './pages/RecordPayment';
import MillerCommissiondars from './pages/MillerCommissiondars';
import MillerLoans from './pages/MillerLoans';
import MillerExports from './pages/MillerExports';
import MillerReports from './pages/MillerReports';
import MillerProfile from './pages/MillerProfile';

// Commissiondar pages
import CommissiondarDashboard from './pages/CommissiondarDashboard';
import CommissiondarFarmers from './pages/CommissiondarFarmers';
import CommissiondarFarmerDashboard from './pages/CommissiondarFarmerDashboard';
import CommissiondarGrainTypes from './pages/CommissiondarGrainTypes';
import CommissiondarStock from './pages/CommissiondarStock';
import CommissiondarMills from './pages/CommissiondarMills';
import CommissiondarLedger from './pages/CommissiondarLedger';
import CommissiondarLoans from './pages/CommissiondarLoans';
import CommissiondarReports from './pages/CommissiondarReports';
import CommissiondarProfile from './pages/CommissiondarProfile';

/* Miller and Commissiondar navigation */
function TopNavigation({ commissiondhar = false }) {
  const { logout, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const links = commissiondhar
    ? [
        { to: '/commissiondar', label: 'Dashboard', end: true },
        { to: '/commissiondar/farmers', label: 'Farmers' },
        { to: '/commissiondar/grain-types', label: 'Custom Grains' },
        { to: '/commissiondar/stock', label: 'Stock' },
        { to: '/commissiondar/mills', label: 'My Mills' },
        { to: '/commissiondar/ledger', label: 'Mill Ledger' },
        { to: '/commissiondar/loans', label: 'Farmer Loans' },
        { to: '/commissiondar/reports', label: 'Reports' },
        { to: '/commissiondar/profile', label: 'Profile' },
      ]
    : [
        { to: '/dashboard', label: 'Dashboard', end: true },
        { to: '/grains', label: 'Grains' },
        { to: '/inventory', label: 'Inventory' },
        { to: '/farmers', label: 'Farmers' },
        { to: '/commissiondars', label: 'Contacts' },
        { to: '/intake', label: 'Intake' },
        { to: '/payment', label: 'Payments' },
        { to: '/loans', label: 'Loans' },
        { to: '/exports', label: 'Exports' },
        { to: '/reports', label: 'Reports' },
        { to: '/profile', label: 'Profile' },
      ];

  const profilePath = commissiondhar ? '/commissiondar/profile' : '/profile';
  const roleName = commissiondhar ? 'Commissiondar' : 'Miller';
  const roleDisplay = commissiondhar ? 'Commission Agent' : 'Mill Owner';

  return (
    <>
      <header className="top-navigation">
        <NavLink
          to={commissiondhar ? '/commissiondar' : '/dashboard'}
          className="top-brand"
          aria-label="GrainLedger home"
        >
          <span className="top-brand-mark"></span>
          <span className="top-brand-copy">
            <span className="top-brand-name">GRAIN LEDGER</span>
            <span className="top-brand-subtitle">
              {commissiondhar ? 'COMMISSION AGENT SUITE' : 'RICE MILL MANAGEMENT'}
            </span>
          </span>
        </NavLink>

        <nav className="top-nav-links" aria-label="Main navigation">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end || false}
              className={({ isActive }) =>
                `top-nav-link${isActive ? ' top-nav-link-active' : ''}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="top-nav-account">
          <NavLink
            to={profilePath}
            className="top-account-details"
            style={{ textDecoration: 'none', cursor: 'pointer' }}
            title="View profile and account settings"
          >
            <span className="top-account-name">
              {user?.name || roleName}
            </span>
            <span className="top-account-role">
              {roleName}
            </span>
          </NavLink>

          <button
            type="button"
            className="top-logout-button"
            onClick={logout}
          >
            Logout
          </button>
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <button
          type="button"
          className="mobile-nav-toggle"
          onClick={() => setMobileMenuOpen(prev => !prev)}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          )}
        </button>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="mobile-nav-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer Panel */}
      <aside
        className={`mobile-nav-drawer ${mobileMenuOpen ? 'mobile-nav-drawer-open' : ''}`}
        aria-label="Mobile Navigation Drawer"
      >
        <div className="mobile-nav-header">
          <div className="mobile-nav-brand">
            <span className="top-brand-mark" style={{ width: 36, height: 36, flexBasis: 36, fontSize: 18 }}></span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#f8fafc', letterSpacing: '-0.3px' }}>GRAIN LEDGER</div>
              <div style={{ fontSize: '9px', color: 'var(--green-light)', letterSpacing: '0.8px', fontWeight: 700 }}>
                {commissiondhar ? 'COMMISSION SUITE' : 'RICE MILL MANAGEMENT'}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="mobile-nav-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <NavLink
          to={profilePath}
          onClick={() => setMobileMenuOpen(false)}
          className="mobile-nav-user-card"
        >
          <div className="mobile-user-avatar">
            {(user?.name || roleName)[0]?.toUpperCase()}
          </div>
          <div className="mobile-user-info">
            <div className="mobile-user-name">{user?.name || roleName}</div>
            <div className="mobile-user-role-badge">
              <span className="status-dot"></span>
              {roleDisplay}
            </div>
          </div>
          <span style={{ marginLeft: 'auto', color: 'var(--green-light)', fontSize: '13px' }}>Settings →</span>
        </NavLink>

        <nav className="mobile-nav-menu" aria-label="Mobile links">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end || false}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `mobile-nav-item${isActive ? ' mobile-nav-item-active' : ''}`
              }
            >
              <span>{link.label}</span>
              <span className="mobile-nav-arrow">→</span>
            </NavLink>
          ))}
        </nav>

        <div className="mobile-nav-footer">
          <button
            type="button"
            className="mobile-logout-button"
            onClick={() => {
              setMobileMenuOpen(false);
              logout();
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

/* Miller application */
function MillerApp() {
  return (
    <div className="app-layout top-layout">
      <TopNavigation />

      <main className="app-main">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/grains" element={<MillerGrains />} />
          <Route path="/inventory" element={<MillerInventory />} />
          <Route path="/farmers" element={<Farmers />} />
          <Route path="/farmers/:id" element={<FarmerDetail />} />
          <Route path="/commissiondars" element={<MillerCommissiondars />} />
          <Route path="/intake" element={<RecordIntake />} />
          <Route path="/payment" element={<RecordPayment />} />
          <Route path="/loans" element={<MillerLoans />} />
          <Route path="/exports" element={<MillerExports />} />
          <Route path="/reports" element={<MillerReports />} />
          <Route path="/profile" element={<MillerProfile />} />

          <Route
            path="*"
            element={<Navigate to="/dashboard" replace />}
          />
        </Routes>
      </main>
    </div>
  );
}

/* Commissiondar application */
function CommissiondarApp() {
  return (
    <div className="app-layout top-layout">
      <TopNavigation commissiondhar />

      <main className="app-main">
        <Routes>
          <Route index element={<CommissiondarDashboard />} />
          <Route path="farmers" element={<CommissiondarFarmers />} />
          <Route path="farmers/:id" element={<CommissiondarFarmerDashboard />} />
          <Route path="grain-types" element={<CommissiondarGrainTypes />} />
          <Route path="stock" element={<CommissiondarStock />} />
          <Route path="mills" element={<CommissiondarMills />} />
          <Route path="ledger" element={<CommissiondarLedger />} />
          <Route path="loans" element={<CommissiondarLoans />} />
          <Route path="reports" element={<CommissiondarReports />} />
          <Route path="profile" element={<CommissiondarProfile />} />

          <Route
            path="*"
            element={<Navigate to="/commissiondar" replace />}
          />
        </Routes>
      </main>
    </div>
  );
}

/* Admin application */
function AdminApp() {
  return <AdminDashboard />;
}

function App() {
  const location = useLocation();
  const { token } = useAuth();

  const isLogin = location.pathname === '/';

  const isPublicRegistration =
    location.pathname === '/register' ||
    location.pathname === '/register/miller' ||
    location.pathname === '/register/commissiondar';

  const isPublicPage = isLogin || isPublicRegistration;

  if (!isPublicPage && !token) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      {isPublicPage && <div className="login-bg" />}
      {isPublicPage && <ParticleBackground />}

      <div className="app">
        <Routes>
          <Route path="/" element={<Login />} />

          <Route path="/register" element={<Register />} />

          <Route
            path="/register/miller"
            element={<MillerRegister />}
          />

          <Route
            path="/register/commissiondar"
            element={<CommissiondarRegister />}
          />

          {/* Admin routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminApp />
              </ProtectedRoute>
            }
          />

          {/* Commissiondar routes */}
          <Route
            path="/commissiondar/*"
            element={
              <ProtectedRoute roles={['party']}>
                <CommissiondarApp />
              </ProtectedRoute>
            }
          />

          {/* Miller routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute roles={['owner']}>
                <MillerApp />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </>
  );
}

export default App;
