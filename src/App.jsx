import RecordIntake from './pages/RecordIntake';
import RecordPayment from './pages/RecordPayment';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import ParticleBackground from './components/ParticleBackground';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import { t } from './strings';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Farmers from './pages/Farmers';
import FarmerDetail from './pages/FarmerDetail';

function App() {
  const isLogin = useLocation().pathname === '/';
  const { logout } = useAuth();

  return (
    <>
      {isLogin && <div className="login-bg" />}
      <ParticleBackground />
      <div className="app">
        {!isLogin && (
          <nav className="nav">
            <span className="brand">Rice Mill Ledger</span>
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/farmers">Farmers</NavLink>
            <NavLink to="/intake">{t.recordIntake}</NavLink>
            <NavLink to="/payment">{t.recordPayment}</NavLink>
            <button onClick={logout}>{t.logout}</button>
          </nav>
        )}
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/farmers" element={<ProtectedRoute><Farmers /></ProtectedRoute>} />
          <Route path="/farmers/:id" element={<ProtectedRoute><FarmerDetail /></ProtectedRoute>} />
          <Route path="/intake" element={<ProtectedRoute><RecordIntake /></ProtectedRoute>} />
          <Route path="/payment" element={<ProtectedRoute><RecordPayment /></ProtectedRoute>} />
        </Routes>
      </div>
    </>
  );
}

export default App;