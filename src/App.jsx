
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
import Dashboard from './pages/Dashboard';
import Farmers from './pages/Farmers';
import FarmerDetail from './pages/FarmerDetail';
import RecordIntake from './pages/RecordIntake';
import RecordPayment from './pages/RecordPayment';

import CommissiondarDashboard from './pages/CommissiondarDashboard';
import CommissiondarLoans from './pages/CommissiondarLoans';
import CommissiondarStock from './pages/CommissiondarStock';

function MillerApp() {
  const { logout, user } = useAuth();

  return (
    <>
      <nav className="nav">
        <span className="brand">Rice Mill Ledger</span>

        <NavLink to="/dashboard">{t.dashboard}</NavLink>
        <NavLink to="/farmers">{t.farmers}</NavLink>
        <NavLink to="/intake">{t.recordIntake}</NavLink>
        <NavLink to="/payment">{t.recordPayment}</NavLink>

        <span className="nav-user">
          {user?.name || 'Miller'}
        </span>

        <button onClick={logout}>Logout</button>
      </nav>

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
    </>
  );
}

function CommissiondarApp() {
  const { logout, user } = useAuth();

  return (
    <>
      <nav className="nav">
        <span className="brand">Commissiondhar Ledger</span>

        <NavLink to="/commissiondar" end>
          Dashboard
        </NavLink>

        <NavLink to="/commissiondar/loans">
          Farmer Loans
        </NavLink>

        <NavLink to="/commissiondar/stock">
          My Stock
        </NavLink>

        <span className="nav-user">
          {user?.name || 'Commissiondhar'}
        </span>

        <button onClick={logout}>Logout</button>
      </nav>

      <Routes>
        <Route
          index
          element={<CommissiondarDashboard />}
        />

        <Route
          path="loans"
          element={<CommissiondarLoans />}
        />

        <Route
          path="stock"
          element={<CommissiondarStock />}
        />

        <Route
          path="*"
          element={<Navigate to="/commissiondar" replace />}
        />
      </Routes>
    </>
  );
}

function App() {
  const location = useLocation();
  const { user } = useAuth();

  const isLogin = location.pathname === '/';

  if (!isLogin && !user) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      {isLogin && <div className="login-bg" />}

      <ParticleBackground />

      <div className="app">
        <Routes>
          <Route
            path="/"
            element={<Login />}
          />

          <Route
            path="/commissiondar/*"
            element={
              <ProtectedRoute roles={['party']}>
                <CommissiondarApp />
              </ProtectedRoute>
            }
          />

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
