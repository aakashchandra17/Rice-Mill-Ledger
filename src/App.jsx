
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
import { t } from './strings';

import Login from './pages/Login';
import Register from './pages/Register';
import MillerRegister from './pages/MillerRegister';
import CommissiondarRegister from './pages/CommissiondarRegister';

import Dashboard from './pages/Dashboard';
import Farmers from './pages/Farmers';
import FarmerDetail from './pages/FarmerDetail';
import RecordIntake from './pages/RecordIntake';
import RecordPayment from './pages/RecordPayment';

import CommissiondarDashboard from './pages/CommissiondarDashboard';
import CommissiondarLoans from './pages/CommissiondarLoans';
import CommissiondarStock from './pages/CommissiondarStock';

/* Miller and Commissiondar navigation */
function TopNavigation({ commissiondhar = false }) {
  const { logout, user } = useAuth();

  const links = commissiondhar
    ? [
        { to: '/commissiondar', label: 'Dashboard', end: true },
        { to: '/commissiondar/loans', label: 'Farmer Loans' },
        { to: '/commissiondar/stock', label: 'My Stock' },
      ]
    : [
        { to: '/dashboard', label: t.dashboard },
        { to: '/farmers', label: t.farmers },
        { to: '/intake', label: t.recordIntake },
        { to: '/payment', label: t.recordPayment },
      ];

  return (
    <header className="top-navigation">
      <NavLink
        to={commissiondhar ? '/commissiondar' : '/dashboard'}
        className="top-brand"
        aria-label="GrainLedger home"
      >
        <span className="top-brand-mark"></span>
        <span className="top-brand-copy">
          <span className="top-brand-name">GRAIN LEDGER</span>
          <span className="top-brand-subtitle">RICE MILL MANAGEMENT</span>
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
        <div className="top-account-details">
          <span className="top-account-name">
            {user?.name || (commissiondhar ? 'Commissiondhar' : 'Miller')}
          </span>
          <span className="top-account-role">
            {commissiondhar ? 'Commissiondhar' : 'Miller'}
          </span>
        </div>

        <button
          type="button"
          className="top-logout-button"
          onClick={logout}
        >
          Logout
        </button>
      </div>
    </header>
  );
}

/* Admin navigation */
function AdminNavigation() {
  const { logout, user } = useAuth();

  return (
    <header className="top-navigation">
      <NavLink
        to="/admin"
        className="top-brand"
        aria-label="GrainLedger Admin home"
      >
        <span className="top-brand-mark"></span>
        <span className="top-brand-copy">
          <span className="top-brand-name">GRAIN LEDGER</span>
          <span className="top-brand-subtitle">ADMINISTRATION</span>
        </span>
      </NavLink>

      <nav className="top-nav-links" aria-label="Admin navigation">
        <NavLink
          to="/admin"
          end
          className={({ isActive }) =>
            `top-nav-link${isActive ? ' top-nav-link-active' : ''}`
          }
        >
          Dashboard
        </NavLink>
      </nav>

      <div className="top-nav-account">
        <div className="top-account-details">
          <span className="top-account-name">
            {user?.name || 'Administrator'}
          </span>
          <span className="top-account-role">Admin</span>
        </div>

        <button
          type="button"
          className="top-logout-button"
          onClick={logout}
        >
          Logout
        </button>
      </div>
    </header>
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
          <Route path="/farmers" element={<Farmers />} />
          <Route path="/farmers/:id" element={<FarmerDetail />} />
          <Route path="/intake" element={<RecordIntake />} />
          <Route path="/payment" element={<RecordPayment />} />

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
          <Route path="loans" element={<CommissiondarLoans />} />
          <Route path="stock" element={<CommissiondarStock />} />

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
  const { user } = useAuth();

  return (
    <div className="app-layout top-layout">
      <AdminNavigation />

      <main className="app-main">
        <section style={{ padding: '30px' }}>
          <h1>Grain Ledger Admin Dashboard</h1>
          <p>
            Welcome, {user?.name || 'Administrator'}.
          </p>
          <p>
            Your administrator account is authenticated.
            The admin management dashboard will be added next.
          </p>
        </section>
      </main>
    </div>
  );
}

function App() {
  const location = useLocation();
  const { user } = useAuth();

  const isLogin = location.pathname === '/';

  const isPublicRegistration =
    location.pathname === '/register' ||
    location.pathname === '/register/miller' ||
    location.pathname === '/register/commissiondar';

  const isPublicPage = isLogin || isPublicRegistration;

  if (!isPublicPage && !user) {
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
