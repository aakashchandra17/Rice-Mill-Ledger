
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { token, role } = useAuth();

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (!['owner', 'party'].includes(role)) {
    return <Navigate to="/" replace />;
  }

  if (roles && !roles.includes(role)) {
    const home = role === 'party' ? '/commissiondar' : '/dashboard';

    return (
      <div className="panel">
        <h1>Access not allowed</h1>
        <p>Your account does not have permission to view this page.</p>
        <Link to={home}>Return to your dashboard</Link>
      </div>
    );
  }

  return children;
}
