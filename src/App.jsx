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
            {user?.name || (commissiondhar ? 'Commissiondar' : 'Miller')}
          </span>
          <span className="top-account-role">
            {commissiondhar ? 'Commissiondar' : 'Miller'}
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
